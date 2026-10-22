import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

interface ActiveCountryContextType {
  /** Country UUID from JWT — tenant scope for cache keys. */
  activeCountryId: string | null;
}

const ActiveCountryContext = createContext<ActiveCountryContextType | undefined>(undefined);

export const ActiveCountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { claims } = useAuth();
  const activeCountryId = claims?.country_id ? String(claims.country_id) : null;

  return (
    <ActiveCountryContext.Provider value={{ activeCountryId }}>
      {children}
    </ActiveCountryContext.Provider>
  );
};

export const useActiveCountry = () => {
  const context = useContext(ActiveCountryContext);
  if (!context) {
    throw new Error('useActiveCountry must be used within an ActiveCountryProvider');
  }
  return context;
};
