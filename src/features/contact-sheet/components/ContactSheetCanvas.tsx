import { useEffect, useRef, useState, type Ref } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { contactSheetPalette, defaultContactSheetAppearance, type ContactSheetAppearance } from '../utils/contactSheetAppearance';
import type { ContactSheetLayout } from '../utils/contactSheetLayout';
import { getContactSheetPhotoTransform } from '../utils/contactSheetPhotoTransform';

export type ContactSheetFrame = { id: string; uri?: string; number: number };
export type ContactSheetHeader = { left: string; center: string; right: string };
const filmFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

type Props = {
  layout: ContactSheetLayout; rows: ContactSheetFrame[][]; header: ContactSheetHeader;
  appearance?: ContactSheetAppearance;
  /** Printed on Frame card edges; the roll's own film name. */
  edgeLabel?: string;
  /** Frame card backdrop photo id; undefined uses the first photo, null shows the plain background. */
  backdropId?: string | null;
  width: number; unavailableLabel: string; canvasRef?: Ref<View>;
  onReady?: () => void; onFailure?: () => void;
};

/** The same declarative film design renders at preview or physical export resolution. */
export function ContactSheetCanvas({ layout, rows, header, width, unavailableLabel, canvasRef, onReady, onFailure, edgeLabel, backdropId, appearance = defaultContactSheetAppearance }: Props) {
  const scale = width / layout.width;
  const palette = contactSheetPalette({ ...appearance, frameStyle: layout.frameStyle });
  const [laidOut, setLaidOut] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const finished = useRef(new Set<string>());
  // Frame card shows a chosen photo (first by default) full-bleed behind the panel; capture waits for it too.
  const backdropUri = !layout.card || backdropId === null ? undefined
    : (rows.flat().find(frame => frame.id === backdropId) ?? rows[0]?.[0])?.uri;
  const count = rows.reduce((total, row) => total + row.length, 0) + (backdropUri ? 1 : 0);
  const markLoaded = (id: string) => { if (!finished.current.has(id)) { finished.current.add(id); setLoaded(value => value + 1); } };
  const panelWidth = layout.columns * layout.frameWidth + (layout.columns - 1) * layout.frameGap + layout.stripPadding * 2;
  useEffect(() => {
    if (!laidOut || loaded !== count || !onReady) return;
    // Image load events precede native drawing. Wait for a painted frame before capture.
    let next = 0;
    const first = requestAnimationFrame(() => { next = requestAnimationFrame(onReady); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(next); };
  }, [laidOut, loaded, count, onReady]);

  return <View ref={canvasRef} collapsable={false} onLayout={() => setLaidOut(true)}
    style={{ width, height: layout.height * scale, backgroundColor: palette.background, paddingHorizontal: layout.padding * scale,
      paddingTop: layout.padding * scale, paddingBottom: layout.bottomPadding * scale }}>
    {backdropUri ? <>
      <Image source={{ uri: backdropUri }} resizeMode="cover" resizeMethod="resize" fadeDuration={0} onLoad={() => markLoaded('backdrop')}
        onError={onFailure} style={{ position: 'absolute', left: 0, top: 0, width, height: layout.height * scale }} />
      {/* The chosen background tints the photo, e.g. Darkroom red. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height: layout.height * scale, backgroundColor: palette.background, opacity: 0.55 }} />
    </> : null}
    <View style={{ height: layout.headerHeight * scale, flexDirection: 'row', alignItems: 'flex-start' }}>
      {[header.left, header.center, header.right].map((label, index) => <Text key={index} allowFontScaling={false} numberOfLines={2}
        style={{ flex: 1, color: palette.header, fontSize: 28 * scale, lineHeight: 36 * scale,
          fontFamily: filmFont, textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right' }}>{label}</Text>)}
    </View>
    <View style={layout.card ? { width: panelWidth * scale, backgroundColor: cardInk.panel, borderRadius: 28 * scale, overflow: 'hidden' } : undefined}>
    {rows.map((row, rowIndex) => {
      const stripWidth = row.length * layout.frameWidth + (row.length - 1) * layout.frameGap + layout.stripPadding * 2;
      return <View key={rowIndex} style={{ width: stripWidth * scale, height: layout.stripHeight * scale,
        marginBottom: rowIndex < rows.length - 1 ? layout.stripGap * scale : 0, backgroundColor: layout.strip ? palette.strip : 'transparent' }}>
        {layout.perforated && !layout.vertical ? <SprocketHoles width={stripWidth} scale={scale} top={14} color={palette.hole} /> : null}
        {layout.card ? <>
          <CardHoles width={panelWidth} scale={scale} top={68} />
          <CardHoles width={panelWidth} scale={scale} top={layout.photoTop + layout.frameHeight + 10} />
        </> : null}
        {row.map((frame, column) => <FilmFrame key={frame.id} frame={frame} layout={layout} column={column}
          scale={scale} palette={palette} extendStrip={Boolean(rows[rowIndex + 1]?.[column])} edgeLabel={edgeLabel} unavailableLabel={unavailableLabel} onFailure={onFailure}
          onLoaded={() => markLoaded(frame.id)} />)}
        {layout.perforated && !layout.vertical ? <SprocketHoles width={stripWidth} scale={scale} top={layout.stripHeight - 30} color={palette.hole} /> : null}
        {/* An overlay edge keeps the light rebate visible on light paper without shifting the frames. */}
        {layout.frameStyle === 'film-strip' ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 2 * scale, borderColor: palette.edge }} /> : null}
      </View>;
    })}
    </View>
  </View>;
}

const cardInk = { panel: '#161616', hole: '#050505', text: '#F4F1EA' };

/** Rounded sprocket holes spanning the whole Frame card panel, centred. */
function CardHoles({ width, scale, top }: { width: number; scale: number; top: number }) {
  const pitch = 84; const hole = 30;
  const count = Math.max(0, Math.floor((width - 24 + pitch - hole) / pitch));
  const start = (width - (count * pitch - (pitch - hole))) / 2;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: top * scale, width: width * scale, height: 38 * scale }}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={{ position: 'absolute', left: (start + i * pitch) * scale, top: 0,
      width: hole * scale, height: 38 * scale, borderRadius: 8 * scale, backgroundColor: cardInk.hole }} />)}
  </View>;
}

/** Bold edge print: film name and number above, frame number and arrow below. */
function CardMarks({ left, width, layout, scale, number, label }: { left: number; width: number; layout: ContactSheetLayout; scale: number; number: number; label: string }) {
  const k = Math.min(1, layout.frameWidth / 520) * scale;
  const ink = { color: cardInk.text, fontWeight: '900' as const };
  return <>
    <View pointerEvents="none" style={{ position: 'absolute', left, top: 14 * scale, width, height: 48 * scale, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text allowFontScaling={false} numberOfLines={1} style={{ ...ink, flexShrink: 1, fontSize: 25 * k, letterSpacing: 1.5 * k }}>{label}</Text>
      <Text allowFontScaling={false} style={{ ...ink, fontSize: 36 * k, marginLeft: 12 * k }}>{number}</Text>
    </View>
    <View pointerEvents="none" style={{ position: 'absolute', left, top: (layout.photoTop + layout.frameHeight + 58) * scale, width, height: 62 * scale,
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
      <Text allowFontScaling={false} style={{ ...ink, fontSize: 36 * k, marginRight: width * 0.24 }}>{number}</Text>
      <View style={{ alignItems: 'center', paddingBottom: 6 * k }}>
        <Text allowFontScaling={false} style={{ ...ink, fontSize: 22 * k, lineHeight: 26 * k }}>{number}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 52 * k, height: 4 * k, backgroundColor: cardInk.text }} />
          <View style={{ width: 0, height: 0, borderTopWidth: 7 * k, borderBottomWidth: 7 * k, borderLeftWidth: 12 * k,
            borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: cardInk.text }} />
        </View>
      </View>
    </View>
  </>;
}

function SprocketHoles({ width, scale, top, color }: { width: number; scale: number; top: number; color: string }) {
  const count = Math.floor((width - 24) / 38);
  return <View pointerEvents="none" style={{ position: 'absolute', left: 12 * scale, top: top * scale, flexDirection: 'row', gap: 20 * scale }}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={{ width: 18 * scale, height: 16 * scale,
      borderRadius: 3 * scale, backgroundColor: color }} />)}
  </View>;
}

function FilmFrame({ frame, layout, column, scale, palette, extendStrip, edgeLabel, unavailableLabel, onLoaded, onFailure }: {
  frame: ContactSheetFrame; layout: ContactSheetLayout; column: number; scale: number;
  palette: ReturnType<typeof contactSheetPalette>; extendStrip: boolean; edgeLabel?: string;
  unavailableLabel: string; onLoaded: () => void; onFailure?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    let current = true;
    // Keep the measured aperture mounted while a refreshed URI is measured.
    // Clearing dimensions here removes every native Image for a frame.
    setFailed(false);
    if (!frame.uri) { onFailure?.(); return; }
    // Native getSize accounts for EXIF axis swapping; stored/raw pixel metadata may not.
    void Image.getSize(frame.uri).then(size => {
      if (!current) return;
      if (size.width > 0 && size.height > 0) setDimensions(size);
      else { setFailed(true); onFailure?.(); }
    }).catch(() => { if (current) { setFailed(true); onFailure?.(); } });
    return () => { current = false; };
  }, [frame.uri, onFailure]);
  const border = layout.borderWidth * scale;
  const openingWidth = layout.frameWidth * scale;
  const openingHeight = layout.frameHeight * scale;
  const presentation = dimensions ? getContactSheetPhotoTransform(dimensions.width, dimensions.height,
    openingWidth, openingHeight) : null;
  const left = (layout.stripPadding + column * (layout.frameWidth + layout.frameGap)) * scale;
  const classic = layout.frameStyle === 'classic-sprocket';
  return <>
    {layout.vertical ? <VerticalRail classic={classic} left={left - (classic ? 40 : 8) * scale} width={layout.frameWidth + (classic ? 80 : 16)}
      height={layout.stripHeight + (extendStrip ? layout.stripGap : 0)} scale={scale} palette={palette} /> : null}
    {layout.card ? <CardMarks left={left} width={openingWidth} layout={layout} scale={scale} number={frame.number}
      label={`${edgeLabel?.trim() ? edgeLabel.trim().toUpperCase() + ' ' : ''}FRAME`} /> : null}
    {layout.frameStyle !== 'none' && !layout.card ? <Text allowFontScaling={false} style={{ position: 'absolute', left, top: (layout.photoTop - 30) * scale,
      color: palette.number, fontFamily: filmFont, fontSize: 20 * scale, lineHeight: 24 * scale }}>{frameLabel(frame.number, layout.frameStyle)}</Text> : null}
    <View style={{ position: 'absolute', left: left - border, top: layout.photoTop * scale - border, width: openingWidth + border * 2,
      height: openingHeight + border * 2 + layout.chin * scale, backgroundColor: layout.borderWidth ? palette.border : 'transparent' }}>
      <View style={{ position: 'absolute', left: border, top: border, width: openingWidth, height: openingHeight, overflow: 'hidden', backgroundColor: '#000000', borderRadius: layout.card ? 14 * scale : 0, justifyContent: 'center', alignItems: 'center' }}>
      {frame.uri && !failed ? presentation ? <Image source={{ uri: frame.uri }} resizeMode="cover" resizeMethod="resize" fadeDuration={0}
        onLoad={onLoaded} onError={() => { setFailed(true); onFailure?.(); }}
        style={{ position: 'absolute', width: presentation.width, height: presentation.height,
          left: presentation.offsetX, top: presentation.offsetY, transform: [{ rotate: `${presentation.rotation}deg` }] }} /> : null :
        <Text allowFontScaling={false} style={{ color: '#EFECE5', fontSize: 20 * scale }}>{unavailableLabel}</Text>}
      </View>
    </View>
  </>;
}

/** Edge numbering like real rebates: half-frame marks on color negative, arrows on 120 and vertical strips. */
function frameLabel(number: number, style: ContactSheetLayout['frameStyle']) {
  if (style === 'color-negative') return `${number} ▸ ${number}A`;
  if (style === 'medium-format') return `◂ ${number} ▸`;
  return style === 'film-strip-dark' || style === 'classic-sprocket' ? `${number} ▸` : String(number);
}

/** Generic vertical film edges; only frame numbers are printed, never branded edge text. */
function VerticalRail({ left, width, height, scale, palette, classic = false }: {
  classic?: boolean;
  left: number; width: number; height: number; scale: number; palette: ReturnType<typeof contactSheetPalette>;
}) {
  const holes = Math.max(0, Math.floor((height - 12) / 38));
  return <View pointerEvents="none" style={{ position: 'absolute', left, top: 0, width: width * scale, height: height * scale,
    backgroundColor: palette.strip, borderLeftWidth: scale, borderRightWidth: scale, borderColor: palette.edge }}>
    {[classic ? 8 : 2, width - (classic ? 32 : 6)].map(side => <View key={side} style={{ position: 'absolute', left: side * scale, top: 6 * scale }}>
      {Array.from({ length: holes }, (_, i) => <View key={i} style={{ position: 'absolute', top: i * 38 * scale,
        width: (classic ? 24 : 4) * scale, height: (classic ? 25 : 22) * scale, borderRadius: (classic ? 4 : 3) * scale, backgroundColor: classic ? '#E7E2D6' : palette.hole }} />)}
    </View>)}
    <View style={{ position: 'absolute', right: 2 * scale, top: 8 * scale, width: 2 * scale, height: 14 * scale, backgroundColor: palette.marking }} />
    {classic ? Array.from({ length: Math.floor(height / 76) }, (_, i) => <Text key={`edge-${i}`} allowFontScaling={false} style={{ position: 'absolute', right: scale, top: (34 + i * 76) * scale,
      color: palette.number, fontFamily: filmFont, fontSize: 10 * scale, lineHeight: 12 * scale }}>{i % 2 ? 'XX' : '●●'}</Text>) : null}
  </View>;
}
