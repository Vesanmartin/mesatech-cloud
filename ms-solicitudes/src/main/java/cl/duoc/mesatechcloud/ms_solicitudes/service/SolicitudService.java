package cl.duoc.mesatechcloud.ms_solicitudes.service;

import cl.duoc.mesatechcloud.ms_solicitudes.exception.CategoriaNoDisponibleException;
import cl.duoc.mesatechcloud.ms_solicitudes.model.CategoriaLocal;
import cl.duoc.mesatechcloud.ms_solicitudes.model.Estado;
import cl.duoc.mesatechcloud.ms_solicitudes.model.Solicitud;
import cl.duoc.mesatechcloud.ms_solicitudes.repository.CategoriaLocalRepository;
import cl.duoc.mesatechcloud.ms_solicitudes.repository.SolicitudRepository;
import org.springframework.stereotype.Service;
import cl.duoc.mesatechcloud.ms_solicitudes.exception.TransicionEstadoInvalidaException;
import java.util.List;

@Service  // Acordarse que marca logica del negocio
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;     //inywccion de dependencia por constructor, compara al @aUTOWired
    private final CategoriaLocalRepository categoriaLocalRepository;

    public SolicitudService(SolicitudRepository solicitudRepository, CategoriaLocalRepository categoriaLocalRepository){
        this.solicitudRepository =solicitudRepository;
        this.categoriaLocalRepository = categoriaLocalRepository;
    }

    /**
     * EP2: la categoria debe existir en la COPIA LOCAL (recibida por RabbitMQ).
     * Nunca se consulta la base de Catalogo.
     */
    public Solicitud crear (Solicitud solicitud){
        if (solicitud.getCategoriaId() == null) {
            throw new CategoriaNoDisponibleException("Debe indicar categoriaId, elegido desde las categorias disponibles");
        }
        CategoriaLocal categoria = categoriaLocalRepository.findByCategoriaId(solicitud.getCategoriaId())
                .orElseThrow(() -> new CategoriaNoDisponibleException(
                        "La categoria " + solicitud.getCategoriaId() + " aun no esta disponible en Solicitudes. "
                        + "Si se acaba de crear, espere unos segundos e intente nuevamente."));

        solicitud.setId(null);
        solicitud.setCategoria(categoria.getNombre()); // nombre tomado de la copia local, no del cliente
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
