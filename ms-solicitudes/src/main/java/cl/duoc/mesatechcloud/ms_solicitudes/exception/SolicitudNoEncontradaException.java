package cl.duoc.mesatechcloud.ms_solicitudes.exception;

/** No existe una solicitud con el id indicado (se responde 404 en vez de 500). */
public class SolicitudNoEncontradaException extends RuntimeException {
    public SolicitudNoEncontradaException(String mensaje) {
        super(mensaje);
    }
}