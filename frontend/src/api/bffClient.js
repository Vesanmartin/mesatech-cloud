import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiRequest } from '../authConfig';

// URL del API Gateway (configurable con REACT_APP_BFF_URL en frontend/.env)
const BFF_URL = process.env.REACT_APP_BFF_URL || 'https://e2yhtyfdj8.execute-api.us-east-1.amazonaws.com';

// Extrae un mensaje legible del cuerpo de error (los servicios responden {"error": "..."})
function mensajeDeError(texto, status, path) {
  if (!texto) return `Error ${status} llamando a ${path}`;
  try {
    const json = JSON.parse(texto);
    const detalle = json.detalle ? ` ${json.detalle}` : '';
    return json.error ? `${json.error}.${detalle}` : texto;
  } catch {
    return texto;
  }
}

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
    throw new Error(mensajeDeError(textoError, respuesta.status, path));
  }

  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}