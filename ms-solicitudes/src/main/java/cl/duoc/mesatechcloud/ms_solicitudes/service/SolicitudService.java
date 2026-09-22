package cl.duoc.mesatechcloud.ms_solicitudes.service;

import cl.duoc.mesatechcloud.ms_solicitudes.model.Estado;
import cl.duoc.mesatechcloud.ms_solicitudes.model.Solicitud;
import cl.duoc.mesatechcloud.ms_solicitudes.repository.SolicitudRepository;
import org.springframework.stereotype.Service;
import cl.duoc.mesatechcloud.ms_solicitudes.exception.TransicionEstadoInvalidaException;
import java.util.List;

@Service  // Acordarse que marca logica del negocio
public class SolicitudService {
    
    private final SolicitudRepository solicitudRepository;     //inywccion de dependencia por constructor, compara al @aUTOWired

    public SolicitudService(SolicitudRepository solicitudRepository){
        this.solicitudRepository =solicitudRepository;
    }

    public Solicitud crear (Solicitud solicitud){
        return solicitudRepository.save(solicitud);

    }

    public List <Solicitud> listarTodas(){
        return solicitudRepository.findAll();
    }

    public List<Solicitud> listarPorUsuario(String usuarioId){
        return solicitudRepository.findByUsuarioId(usuarioId);
    }

    public Solicitud cambiarEstado(Long id, Estado nuevoEstado){
    Solicitud solicitud = solicitudRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Solicitud no encontrada con id " + id));

    if (nuevoEstado == Estado.RESUELTA && solicitud.getEstado() != Estado.EN_PROCESO) {
        throw new TransicionEstadoInvalidaException(
            "No se puede marcar como RESUELTA una solicitud que no está EN_PROCESO (estado actual: " + solicitud.getEstado() + ")"
        );
    }

    solicitud.setEstado(nuevoEstado);
    return solicitudRepository.save(solicitud);
    }
}