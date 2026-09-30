import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '../../../components/ui/IconButton';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { useThemedStyles } from '../../../constants/theme';
import { useAppStore } from '../../../store/app-store';
import { useTranslation } from '../../../i18n/useTranslation';
import type { RollLocation } from '../../rolls/types';
import { isValidLocation, locationLabel, locationService } from '../services/locationService';
import { createLocationPickerStyles } from '../styles/location-picker.styles';
import { LocationSearch } from './LocationSearch';

type Props = { onClose: () => void } & (
  | { mode: 'select'; location?: RollLocation; onConfirm: (location: RollLocation) => void }
  | { mode: 'view'; location: RollLocation }
);
const defaultRegion: Region = { latitude: 20, longitude: 0, latitudeDelta: 100, longitudeDelta: 100 };
const regionAt = (location: RollLocation): Region => ({ ...location, latitudeDelta: 0.025, longitudeDelta: 0.025 });

export function LocationPicker(props: Props) {
  const styles = useThemedStyles(createLocationPickerStyles);
  const { t } = useTranslation();
  const appearance = useAppStore((state) => state.appearance);
  const initial = isValidLocation(props.location) ? props.location : undefined;
  const [candidate, setCandidate] = useState<RollLocation | undefined>(initial);
  const [resolving, setResolving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [locating, setLocating] = useState(false);
  const map = useRef<MapView>(null);
  const candidateRef = useRef(candidate);
  const reverseRequest = useRef(0);
  const currentRequest = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMovedMap = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => {
    alive.current = false; reverseRequest.current++; currentRequest.current++;
    if (debounce.current) clearTimeout(debounce.current);
  }; }, []);

  function choose(location: RollLocation, animate = false) {
    if (!isValidLocation(location)) return;
    const id = ++reverseRequest.current;
    if (debounce.current) clearTimeout(debounce.current);
    candidateRef.current = location; setCandidate(location); setResolving(true);
    if (animate) {
      userMovedMap.current = false;
      map.current?.animateToRegion(regionAt(location), 350);
    }
    debounce.current = setTimeout(async () => {
      const resolved = await locationService.reverseGeocode(location);
      if (!alive.current || id !== reverseRequest.current) return;
      candidateRef.current = resolved; setCandidate(resolved); setResolving(false);
    }, 650);
  }
  async function currentLocation() {
    if (locating) return;
    const id = ++currentRequest.current;
    const selectionVersion = reverseRequest.current;
    setLocating(true);
    try {
      const result = await locationService.getCurrentLocation();
      if (!alive.current || id !== currentRequest.current) return;
      if (result.status === 'denied') Alert.alert(t('locationPermissionDenied'), t('locationPermissionDescription'));
      else if (selectionVersion === reverseRequest.current) choose(result.location, true);
    } catch { if (alive.current) Alert.alert(t('locationUnavailable')); }
    finally { if (alive.current) setLocating(false); }
  }
  const displayed = props.mode === 'view' ? initial : candidate;
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}><IconButton icon="×" circular accessibilityLabel={t('closeLocation')} onPress={props.onClose} /><Text style={styles.title}>{t(props.mode === 'select' ? 'selectLocation' : 'location')}</Text></View>
        <View style={styles.mapArea}>
          <MapView ref={map} style={styles.map} initialRegion={initial ? regionAt(initial) : defaultRegion} userInterfaceStyle={appearance} showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false}
            onPanDrag={() => { userMovedMap.current = true; }}
            onTouchStart={() => { userMovedMap.current = true; }}
            onRegionChange={() => setMoving(true)}
            onRegionChangeComplete={(region) => {
              setMoving(false);
              if (props.mode !== 'select' || !userMovedMap.current) return;
              userMovedMap.current = false;
              choose({ latitude: region.latitude, longitude: region.longitude });
            }}
            onPress={(event) => { if (props.mode === 'select') choose(event.nativeEvent.coordinate, true); }}
          >{props.mode === 'view' && initial ? <Marker coordinate={initial} title={locationLabel(initial)} description={initial.address} /> : null}</MapView>
          {props.mode === 'select' ? <>
            <View pointerEvents="none" style={styles.centerPin} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('currentLocation')} disabled={locating} onPress={currentLocation} style={styles.locate}>{locating ? <ActivityIndicator /> : <Text style={styles.icon}>◎</Text>}</Pressable>
          </> : null}
        </View>
        <View style={styles.panel}>
          {props.mode === 'select' ? <LocationSearch onSelect={(result) => choose(result, true)} /> : null}
          {displayed ? <><Text style={styles.text}>{locationLabel(displayed)}</Text><Text style={styles.secondary}>{resolving ? t('locationResolving') : displayed.address || t('addressUnavailable')}</Text><Text style={styles.secondary}>{displayed.latitude.toFixed(5)}, {displayed.longitude.toFixed(5)}</Text></> : <Text style={styles.secondary}>{t('moveMap')}</Text>}
          {props.mode === 'select' ? <PrimaryButton disabled={!candidate || moving} label={t('useThisLocation')} onPress={() => { if (candidateRef.current && !moving) props.onConfirm({ ...candidateRef.current }); }} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
