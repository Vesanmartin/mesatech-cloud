import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { apiRequest } from '../authConfig';

function decodificarToken(token) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

export function useRoles() {
  const { instance, accounts } = useMsal();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const obtenerRoles = async () => {
      if (accounts.length === 0) return;
      try {
        const respuestaToken = await instance.acquireTokenSilent({
          ...apiRequest,
          account: accounts[0]
        });
        const claims = decodificarToken(respuestaToken.accessToken);
        setRoles(claims.roles || []);
      } catch (err) {
        console.error('No se pudieron obtener los roles', err);
      }
    };
    obtenerRoles();
  }, [instance, accounts]);

  return roles;
}