/* ==========================================
   Komponen Layar Range Slider
========================================== */
import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Colors from '../constants/colors';

const THUMB_SIZE = 24;

export default function RangeSlider({ 
  min = 0, 
  max = 1000000, 
  step = 10000, 
  initialLow = 0, 
  initialHigh = 1000000, 
  onValueChanged,
  theme,
  activeColor = Colors.primary.blue500
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  
  // Percentages from 0 to 1
  const [lowPct, setLowPct] = useState(0);
  const [highPct, setHighPct] = useState(1);
  
  // Refs for tracking start positions during drag
  const lowStart = useRef(0);
  const highStart = useRef(1);

  const trackWidthRef = useRef(0);
  const lowPctRef = useRef(0);
  const highPctRef = useRef(1);

  useEffect(() => {
    let l = Math.max(0, Math.min(1, (initialLow - min) / (max - min)));
    let h = Math.max(0, Math.min(1, (initialHigh - min) / (max - min)));
    
    // Prevent negative width crash if user inputs inverted min/max
    if (l > h) {
      const temp = l;
      l = h;
      h = temp;
    }

    setLowPct(l);
    setHighPct(h);
    lowPctRef.current = l;
    highPctRef.current = h;
  }, [initialLow, initialHigh, min, max]);

  const handleLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    trackWidthRef.current = w;
  };

  const getVal = (pct) => {
    const rawVal = min + pct * (max - min);
    return Math.round(rawVal / step) * step;
  };

  const updateValues = (l, h) => {
    setLowPct(l);
    setHighPct(h);
    lowPctRef.current = l;
    highPctRef.current = h;
    if (onValueChanged) {
      onValueChanged(getVal(l), getVal(h));
    }
  };

  const lowResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        lowStart.current = lowPctRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (trackWidthRef.current === 0) return;
        const deltaPct = gestureState.dx / trackWidthRef.current;
        let newPct = Math.max(0, Math.min(highPctRef.current, lowStart.current + deltaPct));
        updateValues(newPct, highPctRef.current);
      }
    })
  ).current;

  const highResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        highStart.current = highPctRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (trackWidthRef.current === 0) return;
        const deltaPct = gestureState.dx / trackWidthRef.current;
        let newPct = Math.max(lowPctRef.current, Math.min(1, highStart.current + deltaPct));
        updateValues(lowPctRef.current, newPct);
      }
    })
  ).current;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={[styles.track, { backgroundColor: theme ? theme.border : Colors.light.border }]} />
      <View 
        style={[
          styles.activeTrack, 
          { 
            left: `${lowPct * 100}%`, 
            width: `${(highPct - lowPct) * 100}%`,
            backgroundColor: activeColor
          }
        ]} 
      />
      
      {/* Low Thumb */}
      <View
        {...lowResponder.panHandlers}
        style={[
          styles.thumb,
          { 
            left: `${lowPct * 100}%`,
            transform: [{ translateX: -THUMB_SIZE / 2 }],
            backgroundColor: activeColor
          }
        ]}
      />
      
      {/* High Thumb */}
      <View
        {...highResponder.panHandlers}
        style={[
          styles.thumb,
          { 
            left: `${highPct * 100}%`,
            transform: [{ translateX: -THUMB_SIZE / 2 }],
            backgroundColor: activeColor
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative'
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    position: 'absolute'
  },
  activeTrack: {
    height: 4,
    borderRadius: 2,
    position: 'absolute'
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    position: 'absolute',
    borderWidth: 3,
    borderColor: Colors.common.white,
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  }
});
