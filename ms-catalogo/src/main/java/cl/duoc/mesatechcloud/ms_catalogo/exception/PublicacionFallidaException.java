package cl.duoc.mesatechcloud.ms_catalogo.exception;

import cl.duoc.mesatechcloud.ms_catalogo.model.Categoria;

/** La categoria quedo guardada en RDS Catalogo, pero RabbitMQ no confirmo el evento. */
public class PublicacionFallidaException extends RuntimeException {

    private final Categoria categoria;
    private final String eventId;

    public PublicacionFallidaException(Categoria categoria, String eventId, Throwable causa) {
        super(causa.getMessage(), causa);
        this.categoria = categoria;
        this.eventId = eventId;
    }

    public Categoria getCategoria() { return categoria; }
    public String getEventId() { return eventId; }
}
