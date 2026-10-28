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
  width: number; unavailableLabel: string; canvasRef?: Ref<View>;
  onReady?: () => void; onFailure?: () => void;
};

/** The same declarative film design renders at preview or physical export resolution. */
export function ContactSheetCanvas({ layout, rows, header, width, unavailableLabel, canvasRef, onReady, onFailure, appearance = defaultContactSheetAppearance }: Props) {
  const scale = width / layout.width;
  const palette = contactSheetPalette({ ...appearance, frameStyle: layout.frameStyle });
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
    style={{ width, height: layout.height * scale, backgroundColor: palette.background, paddingHorizontal: layout.padding * scale,
      paddingTop: layout.padding * scale, paddingBottom: layout.bottomPadding * scale }}>
    <View style={{ height: layout.headerHeight * scale, flexDirection: 'row', alignItems: 'flex-start' }}>
      {[header.left, header.center, header.right].map((label, index) => <Text key={index} allowFontScaling={false} numberOfLines={2}
        style={{ flex: 1, color: palette.header, fontSize: 28 * scale, lineHeight: 36 * scale,
          fontFamily: filmFont, textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right' }}>{label}</Text>)}
    </View>
    {rows.map((row, rowIndex) => {
      const stripWidth = row.length * layout.frameWidth + (row.length - 1) * layout.frameGap + layout.stripPadding * 2;
      return <View key={rowIndex} style={{ width: stripWidth * scale, height: layout.stripHeight * scale,
        marginBottom: rowIndex < rows.length - 1 ? layout.stripGap * scale : 0, backgroundColor: layout.strip ? palette.strip : 'transparent' }}>
        {layout.perforated && !layout.vertical ? <SprocketHoles width={stripWidth} scale={scale} top={14} color={palette.hole} /> : null}
        {row.map((frame, column) => <FilmFrame key={frame.id} frame={frame} layout={layout} column={column}
          scale={scale} palette={palette} extendStrip={Boolean(rows[rowIndex + 1]?.[column])} unavailableLabel={unavailableLabel} onFailure={onFailure} onLoaded={() => {
            if (!finished.current.has(frame.id)) { finished.current.add(frame.id); setLoaded(value => value + 1); }
          }} />)}
        {layout.perforated && !layout.vertical ? <SprocketHoles width={stripWidth} scale={scale} top={layout.stripHeight - 30} color={palette.hole} /> : null}
        {/* An overlay edge keeps the light rebate visible on light paper without shifting the frames. */}
        {layout.frameStyle === 'film-strip' ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 2 * scale, borderColor: palette.edge }} /> : null}
      </View>;
    })}
  </View>;
}

function SprocketHoles({ width, scale, top, color }: { width: number; scale: number; top: number; color: string }) {
  const count = Math.floor((width - 24) / 38);
  return <View pointerEvents="none" style={{ position: 'absolute', left: 12 * scale, top: top * scale, flexDirection: 'row', gap: 20 * scale }}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={{ width: 18 * scale, height: 16 * scale,
      borderRadius: 3 * scale, backgroundColor: color }} />)}
  </View>;
}

function FilmFrame({ frame, layout, column, scale, palette, extendStrip, unavailableLabel, onLoaded, onFailure }: {
  frame: ContactSheetFrame; layout: ContactSheetLayout; column: number; scale: number;
  palette: ReturnType<typeof contactSheetPalette>; extendStrip: boolean;
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
  return <>
    {layout.vertical ? <VerticalRail left={left - 8 * scale} width={layout.frameWidth + 16}
      height={layout.stripHeight + (extendStrip ? layout.stripGap : 0)} scale={scale} palette={palette} /> : null}
    {layout.frameStyle !== 'none' ? <Text allowFontScaling={false} style={{ position: 'absolute', left, top: (layout.photoTop - 30) * scale,
      color: palette.number, fontFamily: filmFont, fontSize: 20 * scale, lineHeight: 24 * scale }}>{frameLabel(frame.number, layout.frameStyle)}</Text> : null}
    <View style={{ position: 'absolute', left: left - border, top: layout.photoTop * scale - border, width: openingWidth + border * 2,
      height: openingHeight + border * 2 + layout.chin * scale, backgroundColor: layout.borderWidth ? palette.border : 'transparent' }}>
      <View style={{ position: 'absolute', left: border, top: border, width: openingWidth, height: openingHeight, overflow: 'hidden', backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
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
  return style === 'film-strip-dark' ? `${number} ▸` : String(number);
}

/** Generic vertical film edges; only frame numbers are printed, never branded edge text. */
function VerticalRail({ left, width, height, scale, palette }: {
  left: number; width: number; height: number; scale: number; palette: ReturnType<typeof contactSheetPalette>;
}) {
  const holes = Math.max(0, Math.floor((height - 12) / 38));
  return <View pointerEvents="none" style={{ position: 'absolute', left, top: 0, width: width * scale, height: height * scale,
    backgroundColor: palette.strip, borderLeftWidth: scale, borderRightWidth: scale, borderColor: palette.edge }}>
    {[2, width - 6].map(side => <View key={side} style={{ position: 'absolute', left: side * scale, top: 6 * scale }}>
      {Array.from({ length: holes }, (_, i) => <View key={i} style={{ position: 'absolute', top: i * 38 * scale,
        width: 4 * scale, height: 22 * scale, borderRadius: 3 * scale, backgroundColor: palette.hole }} />)}
    </View>)}
    <View style={{ position: 'absolute', right: 2 * scale, top: 8 * scale, width: 2 * scale, height: 14 * scale, backgroundColor: palette.marking }} />
  </View>;
}
