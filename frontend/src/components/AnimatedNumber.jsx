import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export default function AnimatedNumber({ value, isCurrency = false, prefix = '', suffix = '', maxFractionDigits = 0 }) {
  // To avoid hydration errors or weird initial animations, we start at 0 if no value, but jump to value on mount
  const spring = useSpring(0, {
    mass: 0.8,
    stiffness: 75,
    damping: 15
  });
  
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (current) => {
    const formatted = current.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits
    });
    return `${prefix}${formatted}${suffix}`;
  });

  // If not mounted yet, render standard span to avoid hydration mismatch
  if (!hasMounted) {
    return (
      <span>
        {prefix}{value.toLocaleString('en-IN', { maximumFractionDigits: maxFractionDigits })}{suffix}
      </span>
    );
  }

  return <motion.span>{display}</motion.span>;
}
