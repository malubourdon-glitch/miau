import React, { memo, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import {
  AISLE_E_X,
  AISLE_W_X,
  CROSSWALKS_Y,
  ENTRANCE,
  RAMP_X,
  STAIRS_BOTTOM_Y,
  STAIRS_TOP_Y,
  WALKWAY_X,
} from '../data/mockFacility';
import { useTheme } from '../theme/ThemeProvider';
import { Palette } from '../theme/tokens';
import { ParkingFacility, ParkingSpot, Point } from '../types/parking';

const SVG_FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined });

export type SectorFilter = 'all' | 'A' | 'B';

interface ParkingMapProps {
  facility: ParkingFacility;
  sector?: SectorFilter;
  routePoints?: Point[];
  /** Trecho já percorrido (desenhado mais apagado). */
  traveledPoints?: Point[];
  userPosition?: Point & { heading?: number };
  highlightSpotId?: string | null;
  recommendedSpotIds?: string[];
  onSpotPress?: (spot: ParkingSpot) => void;
  /** Descrição textual do mapa para leitores de tela. */
  accessibilityLabel: string;
  height?: number;
}

/** Cor da vaga segundo a legenda: verde livre, vermelho ocupada, azul prioritária livre. */
export function spotColor(spot: ParkingSpot, colors: Palette): string {
  if (spot.status === 'occupied') return colors.occupied;
  if (spot.status === 'reserved') return colors.warning;
  return spot.category === 'regular' ? colors.accent : colors.priority;
}

const VIEWBOX: Record<SectorFilter, string> = {
  all: '0 0 600 1000',
  A: '0 0 600 520',
  B: '0 480 600 520',
};

/**
 * Planta baixa vetorial. O SVG é tratado como UMA imagem para o leitor de
 * tela (com descrição resumida) — a navegação vaga-a-vaga acessível é feita
 * pela visão em lista do Dashboard, que é equivalente e mais eficiente.
 */
function ParkingMapBase({
  facility,
  sector = 'all',
  routePoints,
  traveledPoints,
  userPosition,
  highlightSpotId,
  recommendedSpotIds = [],
  onSpotPress,
  accessibilityLabel,
  height,
}: ParkingMapProps) {
  const { colors, highContrast, radius } = useTheme();
  const ratio = sector === 'all' ? 1000 / 600 : 520 / 600;
  const blockedEdges = useMemo(() => facility.edges.filter((e) => e.blocked), [facility.edges]);
  const nodeById = useMemo(() => new Map(facility.nodes.map((n) => [n.id, n])), [facility.nodes]);
  const recommended = useMemo(() => new Set(recommendedSpotIds), [recommendedSpotIds]);
  const toPoly = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');
  const strokeW = highContrast ? 2.5 : 1.5;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.wrap,
        { aspectRatio: height ? undefined : 1 / ratio, height, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
      ]}
    >
      <Svg width="100%" height="100%" viewBox={VIEWBOX[sector]} preserveAspectRatio="xMidYMid meet">
        {/* Divisa de setores */}
        <Line x1={0} y1={500} x2={600} y2={500} stroke={colors.metal} strokeDasharray="8 8" strokeWidth={2} />
        <SvgText fontFamily={SVG_FONT} x={WALKWAY_X} y={105} fill={colors.textMuted} fontSize={20} fontWeight="800" textAnchor="middle">
          SETOR A
        </SvgText>
        <SvgText fontFamily={SVG_FONT} x={WALKWAY_X} y={935} fill={colors.textMuted} fontSize={20} fontWeight="800" textAnchor="middle">
          SETOR B
        </SvgText>

        {/* Corredores de veículos */}
        {[AISLE_W_X, AISLE_E_X].map((x) => (
          <G key={x}>
            <Rect x={x - 32} y={10} width={64} height={985} fill={colors.surfaceAlt} />
            <Line x1={x} y1={20} x2={x} y2={985} stroke={colors.metal} strokeDasharray="14 12" strokeWidth={2} />
          </G>
        ))}
        <Rect x={AISLE_W_X - 32} y={10} width={AISLE_E_X - AISLE_W_X + 64} height={32} fill={colors.surfaceAlt} />

        {/* Passarela de pedestres + faixas */}
        <Rect x={WALKWAY_X - 50} y={130} width={100} height={750} rx={10} fill={colors.bg} stroke={colors.border} strokeWidth={strokeW} />
        {CROSSWALKS_Y.map((y) => (
          <G key={y}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Rect
                key={i}
                x={AISLE_W_X + 36 + i * 15}
                y={y - 12}
                width={8}
                height={24}
                fill={colors.metal}
                opacity={0.55}
              />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <Rect
                key={`e${i}`}
                x={WALKWAY_X + 52 + i * 15}
                y={y - 12}
                width={8}
                height={24}
                fill={colors.metal}
                opacity={0.55}
              />
            ))}
          </G>
        ))}

        {/* Degraus (barreira) e rampa acessível */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Line
            key={i}
            x1={WALKWAY_X - 40}
            x2={WALKWAY_X + 18}
            y1={STAIRS_TOP_Y + 6 + i * 10}
            y2={STAIRS_TOP_Y + 6 + i * 10}
            stroke={colors.textMuted}
            strokeWidth={3}
          />
        ))}
        <Rect
          x={RAMP_X - 9}
          y={STAIRS_TOP_Y + 4}
          width={18}
          height={STAIRS_BOTTOM_Y - STAIRS_TOP_Y - 8}
          rx={4}
          fill={colors.accentSoft}
          stroke={colors.accent}
          strokeWidth={1.5}
        />

        {/* Vagas */}
        {facility.spots.map((spot) => {
          if (sector !== 'all' && spot.sectorId !== sector) return null;
          const c = spotColor(spot, colors);
          const isHighlight = spot.id === highlightSpotId;
          const isRec = recommended.has(spot.id);
          const fraud = spot.status === 'occupied' && spot.category !== 'regular' && spot.occupantVerified === false;
          return (
            <G key={spot.id} onPress={onSpotPress ? () => onSpotPress(spot) : undefined}>
              <Rect
                x={spot.x + 2}
                y={spot.y + 1}
                width={spot.width - 4}
                height={spot.height - 2}
                rx={4}
                fill={c}
                fillOpacity={spot.status === 'occupied' ? 0.35 : 0.22}
                stroke={isHighlight ? colors.focus : c}
                strokeWidth={isHighlight ? 4 : isRec ? 2.5 : strokeW}
              />
              {spot.hasSideTransferArea ? (
                // Faixa zebrada de transferência lateral (vaga PCD)
                <Path
                  d={`M${spot.x + 4} ${spot.y + spot.height - 14} l${spot.width - 8} 0`}
                  stroke={colors.priority}
                  strokeWidth={6}
                  strokeDasharray="4 4"
                />
              ) : null}
              <SvgText
                fontFamily={SVG_FONT}
                x={spot.x + spot.width / 2}
                y={spot.y + (spot.hasSideTransferArea ? spot.height / 2 - 1 : spot.height / 2 + 5)}
                fill={colors.text}
                fontSize={13}
                fontWeight="700"
                textAnchor="middle"
              >
                {spot.category === 'pcd' ? '♿' : spot.category === 'idoso' ? '60+' : spot.label}
              </SvgText>
              {fraud ? <Circle cx={spot.x + spot.width - 8} cy={spot.y + 8} r={5} fill={colors.warning} /> : null}
            </G>
          );
        })}

        {/* Bloqueios temporários */}
        {blockedEdges.map((e) => {
          const a = nodeById.get(e.from);
          const b = nodeById.get(e.to);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <G key={e.id}>
              <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.occupied} strokeWidth={6} strokeDasharray="6 6" />
              <Circle cx={mx} cy={my} r={14} fill={colors.occupied} />
              <Line x1={mx - 7} y1={my - 7} x2={mx + 7} y2={my + 7} stroke={colors.bg} strokeWidth={3} />
              <Line x1={mx + 7} y1={my - 7} x2={mx - 7} y2={my + 7} stroke={colors.bg} strokeWidth={3} />
            </G>
          );
        })}

        {/* Elevadores */}
        {facility.elevators.map((el) => {
          const n = nodeById.get(el.nodeId);
          if (!n) return null;
          const ok = el.status === 'operational';
          const c = ok ? colors.accent : colors.occupied;
          return (
            <G key={el.id}>
              <Rect x={n.x - 30} y={n.y - 24} width={60} height={48} rx={8} fill={colors.bg} stroke={c} strokeWidth={3} />
              <Path d={`M${n.x - 10} ${n.y - 4} l10 -10 l10 10 Z`} fill={c} />
              <Path d={`M${n.x - 10} ${n.y + 4} l10 10 l10 -10 Z`} fill={c} />
              {!ok ? (
                <Line x1={n.x - 26} y1={n.y + 20} x2={n.x + 26} y2={n.y - 20} stroke={colors.occupied} strokeWidth={4} />
              ) : null}
            </G>
          );
        })}

        {/* Entrada */}
        <Rect x={ENTRANCE.x - 30} y={ENTRANCE.y - 14} width={60} height={14} fill={colors.accent} />
        <SvgText fontFamily={SVG_FONT} x={ENTRANCE.x} y={ENTRANCE.y - 20} fill={colors.accent} fontSize={14} fontWeight="800" textAnchor="middle">
          ENTRADA
        </SvgText>

        {/* Rota */}
        {routePoints && routePoints.length > 1 ? (
          <>
            <Polyline
              points={toPoly(routePoints)}
              fill="none"
              stroke={colors.route}
              strokeOpacity={0.25}
              strokeWidth={18}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Polyline
              points={toPoly(routePoints)}
              fill="none"
              stroke={colors.route}
              strokeWidth={6}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="1 12"
            />
          </>
        ) : null}
        {traveledPoints && traveledPoints.length > 1 ? (
          <Polyline points={toPoly(traveledPoints)} fill="none" stroke={colors.metal} strokeWidth={6} strokeLinecap="round" />
        ) : null}

        {/* Posição do usuário */}
        {userPosition ? (
          <G>
            <Circle cx={userPosition.x} cy={userPosition.y} r={22} fill={colors.priority} opacity={0.25} />
            <Circle cx={userPosition.x} cy={userPosition.y} r={11} fill={colors.priority} stroke={colors.text} strokeWidth={3} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

export const ParkingMap = memo(ParkingMapBase);

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', borderWidth: 1.5 },
});
