import { useEffect, useRef, useState, type Ref } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import type { ContactSheetLayout } from '../utils/contactSheetLayout';
import { getContactSheetPhotoTransform } from '../utils/contactSheetPhotoTransform';

export type ContactSheetFrame = { id: string; uri?: string; number: number };
export type ContactSheetHeader = { left: string; center: string; right: string };
const filmFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

type Props = {
  layout: ContactSheetLayout; rows: ContactSheetFrame[][]; header: ContactSheetHeader;
  width: number; unavailableLabel: string; canvasRef?: Ref<View>;
  onReady?: () => void; onFailure?: () => void;
};

/** The same declarative film design renders at preview or physical export resolution. */
export function ContactSheetCanvas({ layout, rows, header, width, unavailableLabel, canvasRef, onReady, onFailure }: Props) {
  const scale = width / layout.width;
  const [laidOut, setLaidOut] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const finished = useRef(new Set<string>());
  const count = rows.reduce((total, row) => total + row.length, 0);
  useEffect(() => {
    if (!laidOut || loaded !== count || !onReady) return;
    // Image load events precede native drawing. Wait for a painted frame before capture.
    let next = 0;
    const first = requestAnimationFrame(() => { next = requestAnimationFrame(onReady); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(next); };
  }, [laidOut, loaded, count, onReady]);

  return <View ref={canvasRef} collapsable={false} onLayout={() => setLaidOut(true)}
    style={{ width, height: layout.height * scale, backgroundColor: '#000000', paddingHorizontal: layout.padding * scale,
      paddingTop: layout.padding * scale, paddingBottom: layout.bottomPadding * scale }}>
    <View style={{ height: layout.headerHeight * scale, flexDirection: 'row', alignItems: 'flex-start' }}>
      {[header.left, header.center, header.right].map((label, index) => <Text key={index} allowFontScaling={false} numberOfLines={2}
        style={{ flex: 1, color: '#EFECE5', fontSize: 28 * scale, lineHeight: 36 * scale,
          fontFamily: filmFont, textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right' }}>{label}</Text>)}
    </View>
    {rows.map((row, rowIndex) => {
      const stripWidth = row.length * layout.frameWidth + (row.length - 1) * layout.frameGap + layout.stripPadding * 2;
      return <View key={rowIndex} style={{ width: stripWidth * scale, height: layout.stripHeight * scale,
        marginBottom: rowIndex < rows.length - 1 ? layout.stripGap * scale : 0, backgroundColor: '#EFECE5' }}>
        {layout.perforated ? <SprocketHoles width={stripWidth} scale={scale} top={14} /> : null}
        {row.map((frame, column) => <FilmFrame key={frame.id} frame={frame} layout={layout} column={column}
          scale={scale} unavailableLabel={unavailableLabel} onFailure={onFailure} onLoaded={() => {
            if (!finished.current.has(frame.id)) { finished.current.add(frame.id); setLoaded(value => value + 1); }
          }} />)}
        {layout.perforated ? <SprocketHoles width={stripWidth} scale={scale} top={layout.stripHeight - 30} /> : null}
      </View>;
    })}
  </View>;
}

function SprocketHoles({ width, scale, top }: { width: number; scale: number; top: number }) {
  const count = Math.floor((width - 24) / 38);
  return <View pointerEvents="none" style={{ position: 'absolute', left: 12 * scale, top: top * scale, flexDirection: 'row', gap: 20 * scale }}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={{ width: 18 * scale, height: 16 * scale,
      borderRadius: 3 * scale, backgroundColor: '#000000' }} />)}
  </View>;
}

function FilmFrame({ frame, layout, column, scale, unavailableLabel, onLoaded, onFailure }: {
  frame: ContactSheetFrame; layout: ContactSheetLayout; column: number; scale: number;
  unavailableLabel: string; onLoaded: () => void; onFailure?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    let current = true;
    setDimensions(null); setFailed(false);
    if (!frame.uri) { onFailure?.(); return; }
    // Native getSize accounts for EXIF axis swapping; stored/raw pixel metadata may not.
    void Image.getSize(frame.uri).then(size => {
      if (!current) return;
      if (size.width > 0 && size.height > 0) setDimensions(size);
      else { setFailed(true); onFailure?.(); }
    }).catch(() => { if (current) { setFailed(true); onFailure?.(); } });
    return () => { current = false; };
  }, [frame.uri, onFailure]);
  const presentation = dimensions ? getContactSheetPhotoTransform(dimensions.width, dimensions.height,
    layout.frameWidth * scale, layout.frameHeight * scale) : null;
  const left = (layout.stripPadding + column * (layout.frameWidth + layout.frameGap)) * scale;
  return <>
    <Text allowFontScaling={false} style={{ position: 'absolute', left, top: (layout.photoTop - 30) * scale,
      color: '#171717', fontFamily: filmFont, fontSize: 20 * scale, lineHeight: 24 * scale }}>{frame.number}</Text>
    <View style={{ position: 'absolute', left, top: layout.photoTop * scale, width: layout.frameWidth * scale,
      height: layout.frameHeight * scale, overflow: 'hidden', backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
      {frame.uri && !failed ? presentation ? <Image source={{ uri: frame.uri }} resizeMode="cover" resizeMethod="resize"
        onLoad={onLoaded} onError={() => { setFailed(true); onFailure?.(); }}
        style={{ position: 'absolute', width: presentation.width, height: presentation.height,
          left: presentation.offsetX, top: presentation.offsetY, transform: [{ rotate: `${presentation.rotation}deg` }] }} /> : null :
        <Text allowFontScaling={false} style={{ color: '#EFECE5', fontSize: 20 * scale }}>{unavailableLabel}</Text>}
    </View>
  </>;
}
