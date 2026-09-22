package cl.duoc.mesatechcloud.bff.dto;

import java.time.LocalDateTime;

public class SolicitudV2Response {

    private Long id;
    private String titulo;
    private String descripcion;
    private String categoria;
    private String prioridad;
    private Solicitante solicitante;
    private String estado;
    private LocalDateTime fechaCreacion;

    public static SolicitudV2Response desde(SolicitudDTO dto) {
        SolicitudV2Response v2 = new SolicitudV2Response();
        v2.id = dto.getId();
        v2.titulo = dto.getTitulo();
        v2.descripcion = dto.getDescripcion();
        v2.categoria = dto.getCategoria();
        v2.prioridad = dto.getPrioridad();
        v2.estado = dto.getEstado();
        v2.fechaCreacion = dto.getFechaCreacion();
        v2.solicitante = new Solicitante(dto.getUsuarioId());
        return v2;
    }

    public Long getId() { return id; }
    public String getTitulo() { return titulo; }
    public String getDescripcion() { return descripcion; }
    public String getCategoria() { return categoria; }
    public String getPrioridad() { return prioridad; }
    public Solicitante getSolicitante() { return solicitante; }
    public String getEstado() { return estado; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }

    public static class Solicitante {
        private String email;

        public Solicitante(String email) {
            this.email = email;
        }

        public String getEmail() { return email; }
    }
}