import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiRequest } from '../authConfig';

// =========================================================================================
// 📍 CONFIGURACIÓN DE AMAZON API GATEWAY (PUNTO DE ENTRADA OFICIAL EN AWS)
// React (localhost:3000) ➔ AWS API Gateway (HTTPS) ➔ BFF (EC2 A) ➔ Microservicios ➔ RDS
// =========================================================================================
export const API_GATEWAY_URL = 'https://zvedu0xiv1.execute-api.us-east-1.amazonaws.com';
const BFF_URL = API_GATEWAY_URL;
// =========================================================================================

// Extrae un mensaje legible del cuerpo de error (los servicios responden {"error": "..."})
function mensajeDeError(texto, status, path) {
  if (!texto) return `Error ${status} llamando a ${path}`;
  try {
    const json = JSON.parse(texto);
    if (json.campos) {
      const detalleCampos = Object.entries(json.campos).map(([k, v]) => `${k} (${v})`).join(', ');
      return `${json.error}: ${detalleCampos}`;
    }
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
