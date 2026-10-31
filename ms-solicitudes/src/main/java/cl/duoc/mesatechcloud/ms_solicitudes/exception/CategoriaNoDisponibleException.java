package cl.duoc.mesatechcloud.ms_solicitudes.exception;

/** La categoria indicada todavia no llego por RabbitMQ a la copia local de Solicitudes. */
public class CategoriaNoDisponibleException extends RuntimeException {
    public CategoriaNoDisponibleException(String mensaje) {
        super(mensaje);
    }
}
