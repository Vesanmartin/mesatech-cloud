import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiRequest } from '../authConfig';

const BFF_URL = 'https://e2yhtyfdj8.execute-api.us-east-1.amazonaws.com';

export async function llamarBFF(instance, cuenta, path, options = {}) {
  let respuestaToken;

  try {
    respuestaToken = await instance.acquireTokenSilent({
      ...apiRequest,
      account: cuenta
    });
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      respuestaToken = await instance.acquireTokenRedirect({
        ...apiRequest,
        account: cuenta
      });
    } else {
      throw error;
    }
  }

  const respuesta = await fetch(`${BFF_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${respuestaToken.accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!respuesta.ok) {
    const textoError = await respuesta.text();
    throw new Error(textoError || `Error ${respuesta.status} llamando a ${path}`);
  }

  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}