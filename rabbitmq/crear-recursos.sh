#!/usr/bin/env bash
# Crea en el broker: vhost, exchange, cola, binding (desde definiciones/mesatech.json)
# y los dos usuarios de aplicación con permisos MÍNIMOS. Las claves se piden por teclado
# para que no queden en el historial ni en el repositorio.
# Uso (en la EC2 C, con el contenedor arriba):  bash crear-recursos.sh
set -euo pipefail

C=rabbitmq
VHOST=mesatech

echo ">> Importando vhost, exchange, cola y binding"
docker exec "$C" rabbitmqctl import_definitions /etc/rabbitmq/definiciones/mesatech.json

crear_usuario () {
  local usuario=$1
  read -rsp "Clave para $usuario: " clave; echo
  if docker exec "$C" rabbitmqctl list_users --silent | awk '{print $1}' | grep -qx "$usuario"; then
    docker exec "$C" rabbitmqctl change_password "$usuario" "$clave"
  else
    docker exec "$C" rabbitmqctl add_user "$usuario" "$clave"
  fi
  docker exec "$C" rabbitmqctl set_user_tags "$usuario"   # sin tags: no entra al panel ni es administrador
}

echo ">> Usuario publicador (ms-catalogo)"
crear_usuario catalogo_publicador
# configure: nada | write: solo el exchange | read: nada
docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" catalogo_publicador '^$' '^catalogo\.exchange$' '^$'

echo ">> Usuario consumidor (ms-solicitudes)"
crear_usuario solicitudes_consumidor
# configure: nada | write: nada | read: solo la cola
docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" solicitudes_consumidor '^$' '^$' '^solicitudes\.catalogo\.queue$'

echo ">> Admin con acceso al vhost (para ver colas en el panel)"
ADMIN=$(grep '^RABBITMQ_ADMIN_USER=' .env | cut -d= -f2)
docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" "$ADMIN" '.*' '.*' '.*'

echo ">> Verificación"
docker exec "$C" rabbitmqctl list_vhosts
docker exec "$C" rabbitmqctl list_exchanges -p "$VHOST" name type durable
docker exec "$C" rabbitmqctl list_queues -p "$VHOST" name durable auto_delete messages_ready messages_unacknowledged
docker exec "$C" rabbitmqctl list_bindings -p "$VHOST" source_name destination_name routing_key
docker exec "$C" rabbitmqctl list_permissions -p "$VHOST"
echo ">> Listo"
