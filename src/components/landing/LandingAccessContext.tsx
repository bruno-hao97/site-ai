import { createContext, useContext } from 'react';

export const LandingAccessContext = createContext<(() => void) | null>(null);

export function useLandingAccess() {
  const requestAccess = useContext(LandingAccessContext);
  return requestAccess ?? (() => {});
}
