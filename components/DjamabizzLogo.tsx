import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
};

/**
 * Logo Djamabizz : le "B" en arrière-plan, un billet de banque stylisé
 * posé par-dessus, puis "D" et "j" au premier plan (devant le billet).
 * Reproduction fidèle du fichier djb.svg fourni, via react-native-svg
 * (react-native ne peut pas afficher un .svg directement sans cette lib).
 */
export default function DjamabizzLogo({ width = 180, height = 120 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 600 400">
      <Defs>
        <LinearGradient id="orangeGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFB020" />
          <Stop offset="100%" stopColor="#FF7A00" />
        </LinearGradient>
        <LinearGradient id="navyGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#0A1F44" />
          <Stop offset="100%" stopColor="#132B5E" />
        </LinearGradient>
        <LinearGradient id="billGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#2FA84F" />
          <Stop offset="55%" stopColor="#1E7F3B" />
          <Stop offset="100%" stopColor="#0F5C27" />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={600} height={400} fill="#FFFFFF" />

      {/* 1. Lettre B en arriere-plan */}
      <SvgText
        x={300}
        y={250}
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize={200}
        letterSpacing={-6}
        textAnchor="middle"
      >
        <TSpan fill="transparent">Dj</TSpan>
        <TSpan fill="url(#navyGrad5)">B</TSpan>
      </SvgText>

      {/* 2. Billet de banque, entre j et B */}
      <G transform="translate(305,205) rotate(-6)">
        <Rect x={-115} y={-68} width={230} height={136} rx={10} fill="url(#billGrad3)" stroke="#FFD84D" strokeWidth={4} />
        <Rect x={-100} y={-53} width={200} height={106} rx={5} fill="none" stroke="#FFD84D" strokeWidth={2} strokeDasharray="5 4" />
        <Circle cx={-83} cy={-38} r={12} fill="none" stroke="#FFD84D" strokeWidth={2} />
        <Circle cx={83} cy={38} r={12} fill="none" stroke="#FFD84D" strokeWidth={2} />
        <SvgText x={-83} y={-33} fontFamily="Arial, sans-serif" fontSize={14} textAnchor="middle" fill="#FFD84D" fontWeight="900">$</SvgText>
        <SvgText x={83} y={43} fontFamily="Arial, sans-serif" fontSize={14} textAnchor="middle" fill="#FFD84D" fontWeight="900">$</SvgText>
        <Circle cx={0} cy={0} r={36} fill="#0F5C27" stroke="#FFD84D" strokeWidth={3} />
        <SvgText x={0} y={14} fontFamily="Arial, sans-serif" fontSize={36} fontWeight="900" textAnchor="middle" fill="#FFD84D">$</SvgText>
        <Path d="M-100 -24 Q0 -48 100 -24" stroke="#FFD84D" strokeWidth={1.2} fill="none" opacity={0.7} />
        <Path d="M-100 24 Q0 48 100 24" stroke="#FFD84D" strokeWidth={1.2} fill="none" opacity={0.7} />
      </G>

      {/* 3. D et j au premier plan (devant le billet) */}
      <SvgText
        x={300}
        y={250}
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize={200}
        letterSpacing={-6}
        textAnchor="middle"
      >
        <TSpan fill="url(#navyGrad5)">D</TSpan>
        <TSpan fill="url(#orangeGrad5)">j</TSpan>
        <TSpan fill="transparent">B</TSpan>
      </SvgText>
    </Svg>
  );
}
