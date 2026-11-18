import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { C } from '@/theme';

type Point = { x: number; y: number };

function niceRange(min: number, max: number) {
  if (min === max) return { min: min - 1, max: max + 1 };
  const pad = (max - min) * 0.12;
  return { min: Math.max(0, min - pad), max: max + pad };
}

export function LineChart({
  data,
  height = 180,
  color = C.accent,
  format = (v: number) => String(Math.round(v)),
  formatX = (x: number) => new Date(x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
}: {
  data: Point[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
  formatX?: (x: number) => string;
}) {
  const [w, setW] = useState(0);
  const pts = [...data].sort((a, b) => a.x - b.x);
  const padL = 8;
  const padR = 8;
  const padT = 22;
  const padB = 22;
  const body = () => {
    if (w <= 0 || pts.length === 0) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const { min: yMin, max: yMax } = niceRange(Math.min(...ys), Math.max(...ys));
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const sx = (x: number) => (xMax === xMin ? w / 2 : padL + ((x - xMin) / (xMax - xMin)) * (w - padL - padR));
    const sy = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * (height - padT - padB);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
    const area = `${line} L${sx(pts[pts.length - 1].x)},${height - padB} L${sx(pts[0].x)},${height - padB} Z`;
    const maxP = pts.reduce((a, b) => (b.y > a.y ? b : a));
    const last = pts[pts.length - 1];
    const gridY = [0.25, 0.5, 0.75].map((f) => padT + f * (height - padT - padB));
    return (
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {gridY.map((y) => (
          <Line key={y} x1={0} x2={w} y1={y} y2={y} stroke={C.border} strokeDasharray="3 5" strokeWidth={1} />
        ))}
        {pts.length > 1 ? <Path d={area} fill="url(#fill)" /> : null}
        <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.length <= 30 &&
          pts.map((p) => <Circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill={C.bg} stroke={color} strokeWidth={1.5} />)}
        <Circle cx={sx(last.x)} cy={sy(last.y)} r={5} fill={color} />
        <SvgText
          x={Math.min(w - 24, Math.max(24, sx(maxP.x)))}
          y={sy(maxP.y) - 9}
          fill={C.text}
          fontSize={11}
          fontWeight="700"
          textAnchor="middle">
          {format(maxP.y)}
        </SvgText>
        <SvgText x={padL} y={height - 5} fill={C.faint} fontSize={10}>
          {formatX(pts[0].x)}
        </SvgText>
        <SvgText x={w - padR} y={height - 5} fill={C.faint} fontSize={10} textAnchor="end">
          {formatX(last.x)}
        </SvgText>
      </Svg>
    );
  };
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {body()}
    </View>
  );
}

export function BarChart({
  data,
  height = 150,
  color = C.accent,
  goal,
  format = (v: number) => String(Math.round(v)),
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  color?: string;
  goal?: number;
  format?: (v: number) => string;
}) {
  const [w, setW] = useState(0);
  const padT = 18;
  const padB = 20;
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 1);
  const slot = data.length ? w / data.length : 0;
  const bw = Math.min(36, slot * 0.6);
  const sy = (v: number) => padT + (1 - v / max) * (height - padT - padB);
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          {goal ? (
            <Line x1={0} x2={w} y1={sy(goal)} y2={sy(goal)} stroke={C.dim} strokeDasharray="4 4" strokeWidth={1} />
          ) : null}
          {data.map((d, i) => {
            const x = i * slot + (slot - bw) / 2;
            const y = sy(d.value);
            const h = Math.max(2, height - padB - y);
            const met = goal ? d.value >= goal : true;
            return (
              <Rect
                key={i}
                x={x}
                y={height - padB - h}
                width={bw}
                height={h}
                rx={5}
                fill={d.highlight ? color : met ? color + 'AA' : C.surface3}
              />
            );
          })}
          {data.map((d, i) =>
            d.value > 0 ? (
              <SvgText
                key={'v' + i}
                x={i * slot + slot / 2}
                y={sy(d.value) - 5}
                fill={C.dim}
                fontSize={10}
                fontWeight="600"
                textAnchor="middle">
                {format(d.value)}
              </SvgText>
            ) : null,
          )}
          {data.map((d, i) => (
            <SvgText key={'l' + i} x={i * slot + slot / 2} y={height - 5} fill={C.faint} fontSize={10} textAnchor="middle">
              {d.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

/** Ring progress used for the rest timer and weekly goal. */
export function Ring({
  size,
  stroke = 10,
  progress,
  color = C.accent,
  children,
}: {
  size: number;
  stroke?: number;
  progress: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.surface3} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
