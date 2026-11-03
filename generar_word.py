import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_code_block(doc, code_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "1E293B") # Slate 800
    set_cell_margins(cell, top=110, bottom=110, left=160, right=160)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="3B82F6"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(code_text.strip())
    run.font.name = 'Consolas'
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(241, 245, 249)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_callout_box(doc, title, text, bg_hex="EBF8FF", border_hex="3182CE", text_hex="2B6CB0"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r1 = p.add_run(f"📌 {title}\n")
    r1.bold = True
    r1.font.size = Pt(10)
    r1.font.color.rgb = RGBColor.from_string(text_hex)
    r2 = p.add_run(text)
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = RGBColor(45, 55, 72)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def create_guide_docx(filename):
    doc = docx.Document()
    
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(45, 55, 72)

    # Titulo Principal
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    r_title = title_p.add_run("MesaTech Cloud - Guía de Despliegue AWS, API Gateway y Pruebas (EP2)")
    r_title.bold = True
    r_title.font.size = Pt(20)
    r_title.font.color.rgb = RGBColor(26, 54, 93)

    # Subtitulo
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(12)
    r_sub = sub_p.add_run("Asignatura: DSY1107 - Desarrollo Cloud Native I | Duoc UC\n"
                          "Arquitectura Oficial: React ➔ Amazon API Gateway ➔ BFF (EC2 A) ➔ Microservicios (EC2 A/B) ➔ RDS (Catálogo/Solicitudes) + RabbitMQ (EC2 C)")
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = RGBColor(113, 128, 150)

    # Line separator
    p_line = doc.add_paragraph()
    p_line.paragraph_format.space_after = Pt(8)
    r_line = p_line.add_run("―" * 58)
    r_line.font.color.rgb = RGBColor(203, 213, 225)

    # Alerta importante sobre reinicio en AWS Learner Lab
    add_callout_box(doc, 
        "Dinámica de AWS Learner Lab y Estabilidad de la Arquitectura",
        "En AWS Learner Lab las instancias EC2 se apagan al terminar la sesión temporal. "
        "Al volver a encenderlas: 1) Las IPs públicas cambian. 2) Las IPs privadas (172.31.X.X) y endpoints RDS se mantienen. "
        "3) La URL de Amazon API Gateway (https://zvedu0xiv1.execute-api.us-east-1.amazonaws.com) permanece FIJA e INMUTABLE, "
        "por lo que el Frontend local NUNCA debe cambiarse de código ni de variables. "
        "Solo se requiere reanudar los procesos en las EC2 y apuntar API Gateway a la IP de EC2 A mediante el script de 1 paso.",
        bg_hex="FEF3C7", border_hex="D97706", text_hex="B45309")

    # 1. Resumen de Recursos AWS y Credenciales
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. Inventario Oficial de Recursos en AWS y Credenciales")
    r_h1.bold = True
    r_h1.font.size = Pt(14)
    r_h1.font.color.rgb = RGBColor(43, 108, 176)

    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    headers = ["Recurso / Instancia", "Rol y Componentes", "Endpoint / Dirección IP", "Puertos y Reglas SG"]
    widths = [Inches(1.5), Inches(1.6), Inches(2.1), Inches(1.3)]
    
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        hdr_cells[i].width = widths[i]
        set_cell_background(hdr_cells[i], "2B6CB0")
        set_cell_margins(hdr_cells[i], top=70, bottom=70, left=90, right=90)
        p = hdr_cells[i].paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(9.5)

    data = [
        ("Amazon API Gateway\n(HTTP API v2)", "Punto de entrada único HTTPS\nEnrutamiento v1 y v2 hacia BFF", "https://zvedu0xiv1.execute-api.us-east-1.amazonaws.com\n(API ID: zvedu0xiv1)", "443 (HTTPS Público)\nCORS configurado (*)"),
        ("EC2 A (BFF & Catálogo)", "BFF Gateway (8080)\nms-catalogo (8082)", "IP Pública: 98.89.45.101\nIP Privada: 172.31.24.16", "22 (SSH)\n8080 (BFF - Abierto a 0.0.0.0/0)\n8082 (Privado 172.31.0.0/16)"),
        ("EC2 B (Solicitudes)", "ms-solicitudes (8081)\nConsumidor RabbitMQ", "IP Pública: 18.207.127.12\nIP Privada: 172.31.29.191", "22 (SSH)\n8081 (Privado 172.31.0.0/16)"),
        ("EC2 C (RabbitMQ)", "Broker RabbitMQ (5672)\nDashboard Web (15672)", "IP Pública: 3.84.227.25\nIP Privada: 172.31.17.146", "22 (SSH)\n5672 (172.31.0.0/16)\n15672 (0.0.0.0/0)"),
        ("RDS Catálogo (MySQL)", "Base de Datos Catálogo\n(Aislada y privada)", "mesatech-catalogo-db.c1okasyq2r7x.us-east-1.rds.amazonaws.com", "3306 (MySQL)\nSolo tráfico desde EC2 A"),
        ("RDS Solicitudes (MySQL)", "Base de Datos Solicitudes\n(Aislada y privada)", "mesatech-rds-solicitudes-sg.c1okasyq2r7x.us-east-1.rds.amazonaws.com", "3306 (MySQL)\nSolo tráfico desde EC2 B"),
        ("Frontend React (Local)", "SPA React 18 con MSAL Azure AD\nConexión directa vía API Gateway", "http://localhost:3000\n(BFF Client ➔ API Gateway)", "3000 (React Dev Server)")
    ]

    for row_idx, row_data in enumerate(data):
        row = table.add_row()
        bg_col = "F7FAFC" if row_idx % 2 == 0 else "FFFFFF"
        for col_idx, text in enumerate(row_data):
            cell = row.cells[col_idx]
            cell.text = text
            cell.width = widths[col_idx]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=50, bottom=50, left=70, right=70)
            p = cell.paragraphs[0]
            p.runs[0].font.size = Pt(8.5)
            p.runs[0].font.color.rgb = RGBColor(45, 55, 72)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Credenciales Estandarizadas
    p_cred = doc.add_paragraph()
    p_cred.add_run("Credenciales y Parámetros Estandarizados:").bold = True
    p_cred.paragraph_format.space_after = Pt(2)

    cred_bullets = [
        "URL del Frontend Local: http://localhost:3000",
        "URL de Amazon API Gateway: https://zvedu0xiv1.execute-api.us-east-1.amazonaws.com",
        "RabbitMQ Admin Web: http://3.84.227.25:15672 (admin / RabbitMQ2026!)",
        "Usuario Aplicación RDS Catálogo: app_catalogo / 12345678 (Base: catalogo)",
        "Usuario Aplicación RDS Solicitudes: app_solicitudes / 12345678 (Base: solicitudes)",
        "Usuario Maestro RDS: admin (en ambos clústeres MySQL)",
        "RabbitMQ Publicador: catalogo_publicador / CatalogoPass2026! (vHost: mesatech)",
        "RabbitMQ Consumidor: solicitudes_consumidor / SolicitudesPass2026! (vHost: mesatech)",
        "Repositorio Git: https://github.com/Vesanmartin/mesatech-cloud.git (Rama oficial: ep2-frontend-roles)"
    ]
    for b in cred_bullets:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_before = Pt(1)
        bp.paragraph_format.space_after = Pt(1)
        run = bp.add_run(b)
        run.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Configuración y Mapeo en Amazon API Gateway
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. Configuración y Mapeo de Rutas en Amazon API Gateway")
    r_h2.bold = True
    r_h2.font.size = Pt(13)
    r_h2.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph(
        "De acuerdo a la pauta de evaluación EP2, el punto de entrada oficial para todas las peticiones desde el cliente "
        "debe ser Amazon API Gateway. Esto desacopla el cliente web de las direcciones IP de cómputo y provee terminación "
        "HTTPS, CORS centralizado y versionamiento de rutas (/v1 y /v2)."
    )

    add_callout_box(doc,
        "Explicación Técnica del Error '404 Not Found' en el Proxy de API Gateway",
        "En una HTTP API de AWS, cuando se define una ruta como ANY /v1/{proxy+}, API Gateway captura únicamente el texto "
        "después de /v1/ en la variable {proxy}. Por ejemplo, al solicitar /v1/categorias, {proxy} toma el valor 'categorias'.\n"
        "• INCORRECTO: Si la URI de integración es http://IP:8080/{proxy}, API Gateway enviará al BFF http://IP:8080/categorias "
        "(omitiendo el prefijo /v1/), resultando en HTTP 404 Not Found.\n"
        "• CORRECTO: La URI de integración debe ser http://IP:8080/v1/{proxy} para la ruta v1, y http://IP:8080/v2/{proxy} para la ruta v2. "
        "De este modo, el BFF recibe exactamente la ruta anotada en sus controladores Spring Boot.",
        bg_hex="EFF6FF", border_hex="2563EB", text_hex="1D4ED8")

    doc.add_paragraph("Script de Configuración de API Gateway en AWS CloudShell (Ejecutable en 1 paso):").bold = True

    apigw_cmd = """# =========================================================================
# CONFIGURACIÓN AUTOMÁTICA DE RUTAS Y PROXY EN AMAZON API GATEWAY
# Ejecutar en AWS CloudShell
# =========================================================================
API_ID="zvedu0xiv1"
IP_A="98.89.45.101"   # Reemplazar con la IP pública actual de EC2 A

# 1. Crear integración HTTP Proxy para /v1 preservando el prefijo
INT_V1=$(aws apigatewayv2 create-integration \\
  --api-id "$API_ID" \\
  --integration-type HTTP_PROXY \\
  --integration-method ANY \\
  --integration-uri "http://${IP_A}:8080/v1/{proxy}" \\
  --payload-format-version "1.0" \\
  --query "IntegrationId" --output text)

# 2. Crear integración HTTP Proxy para /v2 preservando el prefijo
INT_V2=$(aws apigatewayv2 create-integration \\
  --api-id "$API_ID" \\
  --integration-type HTTP_PROXY \\
  --integration-method ANY \\
  --integration-uri "http://${IP_A}:8080/v2/{proxy}" \\
  --payload-format-version "1.0" \\
  --query "IntegrationId" --output text)

# 3. Vincular integraciones a las rutas oficiales v1 y v2
ROUTE_V1=$(aws apigatewayv2 get-routes --api-id "$API_ID" --query "Items[?contains(RouteKey, 'v1')].RouteId" --output text)
aws apigatewayv2 update-route --api-id "$API_ID" --route-id "$ROUTE_V1" --target "integrations/$INT_V1"

ROUTE_V2=$(aws apigatewayv2 get-routes --api-id "$API_ID" --query "Items[?contains(RouteKey, 'v2')].RouteId" --output text)
aws apigatewayv2 update-route --api-id "$API_ID" --route-id "$ROUTE_V2" --target "integrations/$INT_V2"

# 4. Configurar CORS global en el API Gateway para peticiones desde http://localhost:3000
aws apigatewayv2 update-api --api-id "$API_ID" --cors-configuration \\
  '{"AllowOrigins":["http://localhost:3000","*"],"AllowMethods":["*"],"AllowHeaders":["*"]}'

echo ">>> API Gateway vinculado exitosamente a EC2 A ($IP_A) en /v1 y /v2 con CORS activo." """
    add_code_block(doc, apigw_cmd)

    # 3. Protocolo de Reactivación tras Reinicio
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Protocolo Maestro de Reactivación tras Reinicio o Suspensión de AWS Learner Lab")
    r_h3.bold = True
    r_h3.font.size = Pt(13)
    r_h3.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph(
        "Al reactivar el laboratorio en AWS Academy, siga estrictamente este orden de ejecución (C ➔ B ➔ A ➔ API Gateway ➔ Frontend) "
        "para asegurar que los servicios dependientes encuentren sus conexiones listas:"
    )

    checklist_steps = [
        ("Paso 0: Obtener Direcciones IP en Consola AWS EC2",
         "Ir a la consola de AWS > EC2 > Instancias y anotar:\n"
         "• EC2 A: IP Pública nueva y Privada (ej: 98.89.45.101 | 172.31.24.16)\n"
         "• EC2 B: IP Pública nueva y Privada (ej: 18.207.127.12 | 172.31.29.191)\n"
         "• EC2 C: IP Privada (ej: 172.31.17.146) y Pública (ej: 3.84.227.25)\n"
         "Nota: Las IPs privadas no cambian si las máquinas no son terminadas. Si cambiaron, se actualizan en los .env correspondientes."),
         
        ("Paso 1: Levantar RabbitMQ en EC2 C",
         "Conectar por SSH / EC2 Instance Connect a EC2 C:\n"
         "sudo docker start rabbitmq-mesatech\n"
         "sudo docker ps\n"
         "Verificar acceso al panel: http://<IP_PUBLICA_EC2_C>:15672 (admin / RabbitMQ2026!)"),

        ("Paso 2: Levantar ms-solicitudes en EC2 B",
         "Conectar por SSH / EC2 Instance Connect a EC2 B:\n"
         "cd ~/mesatech-cloud/ms-solicitudes\n"
         "# Verificar que el archivo .env tenga la IP privada de EC2 C y DB_PASSWORD=12345678\n"
         "nohup java -jar target/ms-solicitudes-0.0.1-SNAPSHOT.jar --spring.config.import=optional:file:.env[.properties] > solicitudes.log 2>&1 &\n"
         "# Validar puerto 8081:\n"
         "ss -tulpn | grep 8081"),

        ("Paso 3: Levantar ms-catalogo y BFF en EC2 A",
         "Conectar por SSH / EC2 Instance Connect a EC2 A:\n"
         "# Iniciar Catálogo (puerto 8082)\n"
         "cd ~/mesatech-cloud/ms-catalogo\n"
         "nohup java -jar target/ms-catalogo-0.0.1-SNAPSHOT.jar --spring.config.import=optional:file:.env[.properties] > catalogo.log 2>&1 &\n\n"
         "# Iniciar BFF (puerto 8080)\n"
         "cd ~/mesatech-cloud/bff\n"
         "nohup java -jar target/bff-0.0.1-SNAPSHOT.jar --spring.config.import=optional:file:.env[.properties] > bff.log 2>&1 &\n\n"
         "# Validar ambos puertos activos:\n"
         "ss -tulpn | grep -E '8080|8082'"),

        ("Paso 4: Actualizar Amazon API Gateway (AWS CloudShell)",
         "Abrir CloudShell en la consola de AWS y ejecutar el script del punto 2 con la nueva IP pública de EC2 A:\n"
         "IP_A=\"<NUEVA_IP_PUBLICA_EC2_A>\"\n"
         "# Ejecutar el bloque de actualización de integraciones v1 y v2."),

        ("Paso 5: Abrir el Frontend Local en el Navegador",
         "En su computador personal, abrir Google Chrome o Edge en:\n"
         "http://localhost:3000\n"
         "Presionar Ctrl + F5 para limpiar la memoria caché.\n"
         "Iniciar sesión con Microsoft Entra ID institucional (ej. tia.perez@duocuc.cl). Todas las categorías y solicitudes cargarán de inmediato.")
    ]

    for p_name, p_desc in checklist_steps:
        p_item = doc.add_paragraph(style='List Bullet')
        p_item.paragraph_format.space_before = Pt(3)
        p_item.paragraph_format.space_after = Pt(3)
        r_pn = p_item.add_run(f"{p_name}:\n")
        r_pn.bold = True
        r_pn.font.color.rgb = RGBColor(43, 108, 176)
        p_item.add_run(p_desc)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 4. Despliegue Inicial Detallado en Cada Instancia
    h4 = doc.add_heading(level=1)
    r_h4 = h4.add_run("4. Guía de Instalación y Despliegue Inicial por Instancia")
    r_h4.bold = True
    r_h4.font.size = Pt(13)
    r_h4.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph("4.1 Despliegue en EC2 C (RabbitMQ Message Broker):").bold = True
    c_cmd = """# 1. Instalar Docker
sudo apt update -y && sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

# 2. Configurar docker-compose.yml
mkdir -p ~/rabbitmq && cd ~/rabbitmq
cat << 'EOF' > docker-compose.yml
services:
  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: rabbitmq-mesatech
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: RabbitMQ2026!
EOF

# 3. Iniciar Contenedor
sudo docker compose up -d

# 4. Configurar VHost y Usuarios Segregados (Rúbrica)
C=rabbitmq-mesatech
VHOST=mesatech
sudo docker exec "$C" rabbitmqctl add_vhost "$VHOST"
sudo docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" admin '.*' '.*' '.*'
sudo docker exec "$C" rabbitmqctl add_user catalogo_publicador CatalogoPass2026!
sudo docker exec "$C" rabbitmqctl set_user_tags catalogo_publicador
sudo docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" catalogo_publicador '^$' '^catalogo\\.exchange$' '^$'
sudo docker exec "$C" rabbitmqctl add_user solicitudes_consumidor SolicitudesPass2026!
sudo docker exec "$C" rabbitmqctl set_user_tags solicitudes_consumidor
sudo docker exec "$C" rabbitmqctl set_permissions -p "$VHOST" solicitudes_consumidor '^$' '^$' '^solicitudes\\.catalogo\\.queue$'

# 5. Declarar Exchange, Cola y Binding
sudo docker exec "$C" rabbitmqadmin declare exchange --vhost="$VHOST" -u admin -p RabbitMQ2026! name=catalogo.exchange type=direct durable=true
sudo docker exec "$C" rabbitmqadmin declare queue --vhost="$VHOST" -u admin -p RabbitMQ2026! name=solicitudes.catalogo.queue durable=true
sudo docker exec "$C" rabbitmqadmin declare binding --vhost="$VHOST" -u admin -p RabbitMQ2026! source=catalogo.exchange destination=solicitudes.catalogo.queue routing_key=categoria.creada"""
    add_code_block(doc, c_cmd)

    doc.add_paragraph("4.2 Despliegue en EC2 B (Microservicio ms-solicitudes):").bold = True
    b_cmd = """# 1. Instalar Java 21 y cliente MySQL
sudo apt update -y && sudo apt install -y default-mysql-client openjdk-21-jdk git

# 2. Inicializar RDS Solicitudes con usuario app_solicitudes
mysql -h mesatech-rds-solicitudes-sg.c1okasyq2r7x.us-east-1.rds.amazonaws.com -u admin -p << 'EOF'
CREATE DATABASE IF NOT EXISTS solicitudes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app_solicitudes'@'%' IDENTIFIED BY '12345678';
GRANT ALL PRIVILEGES ON solicitudes.* TO 'app_solicitudes'@'%';
FLUSH PRIVILEGES;

USE solicitudes;
CREATE TABLE IF NOT EXISTS categorias_locales (
    id BIGINT NOT NULL AUTO_INCREMENT,
    categoria_id BIGINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    fecha_evento VARCHAR(40) NOT NULL,
    fecha_recepcion DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_categorias_locales_origen UNIQUE (categoria_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitudes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    categoria_id BIGINT NULL,
    categoria VARCHAR(255) NULL,
    prioridad VARCHAR(255) NULL,
    usuario_id VARCHAR(255) NULL,
    estado VARCHAR(20) NULL,
    fecha_creacion DATETIME(6) NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;
EOF

# 3. Clonar repositorio y compilar
cd ~
git clone -b ep2-frontend-roles https://github.com/Vesanmartin/mesatech-cloud.git
cd mesatech-cloud/ms-solicitudes

cat << 'EOF' > .env
SERVER_PORT=8081
DB_URL=jdbc:mysql://mesatech-rds-solicitudes-sg.c1okasyq2r7x.us-east-1.rds.amazonaws.com:3306/solicitudes
DB_USER=app_solicitudes
DB_PASSWORD=12345678
RABBIT_HOST=172.31.17.146
RABBIT_PORT=5672
RABBIT_VHOST=mesatech
RABBIT_USER=solicitudes_consumidor
RABBIT_PASSWORD=SolicitudesPass2026!
EOF

chmod +x mvnw && ./mvnw clean package -DskipTests
nohup java -jar target/*.jar --spring.config.import=optional:file:.env[.properties] > solicitudes.log 2>&1 &"""
    add_code_block(doc, b_cmd)

    doc.add_paragraph("4.3 Despliegue en EC2 A (ms-catalogo y BFF Gateway):").bold = True
    a_cmd = """# 1. Instalar Java 21 y cliente MySQL
sudo apt update -y && sudo apt install -y default-mysql-client openjdk-21-jdk git

# 2. Inicializar RDS Catálogo con usuario app_catalogo
mysql -h mesatech-catalogo-db.c1okasyq2r7x.us-east-1.rds.amazonaws.com -u admin -p << 'EOF'
CREATE DATABASE IF NOT EXISTS catalogo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app_catalogo'@'%' IDENTIFIED BY '12345678';
GRANT ALL PRIVILEGES ON catalogo.* TO 'app_catalogo'@'%';
FLUSH PRIVILEGES;

USE catalogo;
CREATE TABLE IF NOT EXISTS categorias (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BIT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prioridades (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    nivel INT NULL,
    activo BIT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO prioridades (nombre, nivel, activo) VALUES 
('Baja', 1, 1), ('Media', 2, 1), ('Alta', 3, 1), ('Urgente', 4, 1)
ON DUPLICATE KEY UPDATE nombre=nombre;

INSERT INTO categorias (nombre, descripcion, activo) VALUES
('Hardware', 'Fallas de equipos', 1), ('Software', 'Problemas de sistemas', 1),
('Redes', 'Problemas de red y conectividad', 1), ('Accesos y Seguridad', 'Permisos y accesos', 1)
ON DUPLICATE KEY UPDATE nombre=nombre;
EOF

# 3. Clonar repositorio y compilar microservicios
cd ~
git clone -b ep2-frontend-roles https://github.com/Vesanmartin/mesatech-cloud.git

# Configurar ms-catalogo
cd ~/mesatech-cloud/ms-catalogo
cat << 'EOF' > .env
SERVER_PORT=8082
DB_URL=jdbc:mysql://mesatech-catalogo-db.c1okasyq2r7x.us-east-1.rds.amazonaws.com:3306/catalogo
DB_USER=app_catalogo
DB_PASSWORD=12345678
RABBIT_HOST=172.31.17.146
RABBIT_PORT=5672
RABBIT_VHOST=mesatech
RABBIT_USER=catalogo_publicador
RABBIT_PASSWORD=CatalogoPass2026!
EOF
chmod +x mvnw && ./mvnw clean package -DskipTests
nohup java -jar target/*.jar --spring.config.import=optional:file:.env[.properties] > catalogo.log 2>&1 &

# Configurar BFF
cd ~/mesatech-cloud/bff
cat << 'EOF' > .env
SERVER_PORT=8080
MS_CATALOGO_URL=http://localhost:8082
MS_SOLICITUDES_URL=http://172.31.29.191:8081
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://zvedu0xiv1.execute-api.us-east-1.amazonaws.com
EOF
chmod +x mvnw && ./mvnw clean package -DskipTests
nohup java -jar target/*.jar --spring.config.import=optional:file:.env[.properties] > bff.log 2>&1 &"""
    add_code_block(doc, a_cmd)

    # 5. Protocolo de Pruebas Rúbrica EP2
    h5 = doc.add_heading(level=1)
    r_h5 = h5.add_run("5. Protocolo de Pruebas de Evaluación (Rúbrica Oficial EP2)")
    r_h5.bold = True
    r_h5.font.size = Pt(13)
    r_h5.font.color.rgb = RGBColor(43, 108, 176)

    doc.add_paragraph(
        "A continuación se detallan las pruebas requeridas por la pauta EP2 para su demostración ante el docente:"
    )

    tests = [
        ("P1: Validación del Flujo de Entrada con Amazon API Gateway",
         "Petición desde React (http://localhost:3000) hacia la URL de API Gateway (https://zvedu0xiv1.execute-api.us-east-1.amazonaws.com/v1/categorias). "
         "API Gateway valida CORS, aplica la regla de proxy y enruta al BFF en EC2 A (puerto 8080). "
         "Evidencia: En las herramientas de desarrollador del navegador (pestaña Network/Red), las llamadas a las APIs tienen como dominio execute-api.us-east-1.amazonaws.com y devuelven código 200 OK."),

        ("P2: Autenticación Institucional y Matriz de Roles (Azure Entra ID)",
         "Inicio de sesión con cuenta institucional (@duocuc.cl). El BFF valida la firma criptográfica del JWT emitido por Microsoft "
         "y extrae el claim de roles.\n"
         "• Rol ADMINISTRADOR: Acceso completo, mantenimiento de categorías/prioridades, monitor RabbitMQ y reasignación de prioridades.\n"
         "• Rol OPERADOR: Auto-asignación de solicitudes, transición de estados (En Progreso, Resuelta, Cerrada) y notas técnicas.\n"
         "• Rol CLIENTE: Creación de tickets de soporte y seguimiento exclusivo de sus solicitudes."),

        ("P3: Sincronización Asíncrona Event-Driven (ms-catalogo ➔ RabbitMQ ➔ ms-solicitudes)",
         "Como Administrador, crear una nueva categoría de soporte (ej: 'Telefonía IP'). "
         "1. ms-catalogo almacena el registro en la base de datos RDS Catálogo.\n"
         "2. ms-catalogo publica el evento de dominio 'categoria.creada' con UUID único en catalogo.exchange.\n"
         "3. RabbitMQ entrega el mensaje a la cola persistente solicitudes.catalogo.queue.\n"
         "4. ms-solicitudes consume el evento de forma asíncrona y guarda la categoría en la tabla categorias_locales de RDS Solicitudes.\n"
         "Evidencia: Al crear un ticket en el formulario de solicitudes, la nueva categoría aparece de inmediato en la lista desplegable."),

        ("P4: Desacoplamiento y Resiliencia ante Caída del Consumidor",
         "1. En EC2 B, detener el proceso consumidor: pkill -f ms-solicitudes.\n"
         "2. En el Frontend, crear una categoría nueva (ej: 'Ciberseguridad'). El ms-catalogo responde éxito 201 y publica el evento en RabbitMQ.\n"
         "3. En el panel de RabbitMQ (http://3.84.227.25:15672), se observa el mensaje encolado en estado 'Ready' (1 mensaje acumulado sin perderse).\n"
         "4. En EC2 B, volver a levantar el servicio: nohup java -jar target/*.jar ... &\n"
         "5. ms-solicitudes procesa inmediatamente el mensaje acumulado y la cola vuelve a cero (0). Demostración indiscutible de tolerancia a fallos."),

        ("P5: Aislamiento Completo de Bases de Datos RDS MySQL",
         "Verificar que cada microservicio cuenta con su propia instancia de base de datos relacional en Amazon RDS sin cruces:\n"
         "• ms-catalogo opera exclusivamente contra mesatech-catalogo-db (DB: catalogo, Usuario: app_catalogo).\n"
         "• ms-solicitudes opera exclusivamente contra mesatech-rds-solicitudes-sg (DB: solicitudes, Usuario: app_solicitudes).\n"
         "Los grupos de seguridad impiden que EC2 A acceda a RDS Solicitudes o que EC2 B acceda a RDS Catálogo."),

        ("P6: Versionamiento de Endpoints (/v1 y /v2) a través del Gateway",
         "• Endpoints /v1: Gestión CRUD estándar de categorías, prioridades y solicitudes.\n"
         "• Endpoints /v2: Consultas extendidas de auditoría y reportabilidad (SolicitudV2Controller).\n"
         "Ambas versiones coexisten pacíficamente en Amazon API Gateway gracias a las rutas ANY /v1/{proxy+} y ANY /v2/{proxy+}."),

        ("P7: Resiliencia del Frontend (Sin Datos Falsos)",
         "Si alguna instancia de backend se detiene temporalmente, el frontend despliega una advertencia limpia de error de conexión "
         "y NO inyecta datos falsos ('mock data') en la pantalla, garantizando que el usuario y el docente siempre vean la realidad del backend."),

        ("P8: Registro en Repositorio GitHub y Calidad de Código",
         "Todo el código fuente versionado en GitHub: https://github.com/Vesanmartin/mesatech-cloud.git en la rama ep2-frontend-roles. "
         "Incluye scripts Maven, DDL de base de datos, configuraciones de seguridad, contratos de mensajería y componentes React.")
    ]

    for t_name, t_desc in tests:
        p_t = doc.add_paragraph(style='List Bullet')
        p_t.paragraph_format.space_before = Pt(3)
        p_t.paragraph_format.space_after = Pt(3)
        r_tn = p_t.add_run(f"{t_name}:\n")
        r_tn.bold = True
        p_t.add_run(t_desc)

    doc.save(filename)
    print(f"Documento guardado exitosamente en: {filename}")

if __name__ == "__main__":
    out_file = r"d:\tiare\proyectos\cloud native\prueba 2\mesatech-cloud\Guia_Despliegue_AWS_MesaTech_Cloud_EP2.docx"
    create_guide_docx(out_file)
