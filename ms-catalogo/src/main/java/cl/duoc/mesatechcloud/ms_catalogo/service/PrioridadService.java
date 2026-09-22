package cl.duoc.mesatechcloud.ms_catalogo.service;

import cl.duoc.mesatechcloud.ms_catalogo.model.Prioridad;
import cl.duoc.mesatechcloud.ms_catalogo.repository.PrioridadRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PrioridadService {

    private final PrioridadRepository prioridadRepository;

    public PrioridadService(PrioridadRepository prioridadRepository) {
        this.prioridadRepository = prioridadRepository;
    }

    public List<Prioridad> listar() {
        return prioridadRepository.findAll();
    }

    public Prioridad crear(Prioridad prioridad) {
        return prioridadRepository.save(prioridad);
    }

    public Prioridad actualizar(Long id, Prioridad prioridad) {
        prioridad.setId(id);
        return prioridadRepository.save(prioridad);
    }

    public void eliminar(Long id) {
        prioridadRepository.deleteById(id);
    }
}