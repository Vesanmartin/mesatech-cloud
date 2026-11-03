import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiRequest } from '../authConfig';

// =========================================================================================
// 📍 CONFIGURACIÓN DE IP DE AWS (ÚNICO LUGAR DONDE SE CAMBIA EN EL FRONTEND)
// Cada vez que se reinicie AWS Academy Learner Lab y cambie la IP pública de EC2 A:
// Cambia únicamente el valor de IP_PUBLICA_EC2_A y guarda este archivo.
// React lo detectará de inmediato sin necesidad de reiniciar la consola.
// =========================================================================================
export const IP_PUBLICA_EC2_A = '3.84.111.84';
const BFF_URL = `http://${IP_PUBLICA_EC2_A}:8080`;
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
