import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { departments, municipalities } from './shared/schema.ts';
import ws from "ws";

// Coordenadas exactas de departamentos (cabeceras departamentales)
const DEPARTMENT_COORDINATES = {
  '01': { lat: '15.7795', lng: '-86.8458', name: 'La Ceiba' },          // Atlántida
  '02': { lat: '15.9167', lng: '-85.9333', name: 'Trujillo' },         // Colón
  '03': { lat: '14.4603', lng: '-87.6423', name: 'Comayagua' },        // Comayagua
  '04': { lat: '14.7679', lng: '-89.1552', name: 'Santa Rosa de Copán' }, // Copán
  '05': { lat: '15.5024', lng: '-88.0174', name: 'San Pedro Sula' },   // Cortés
  '06': { lat: '13.3097', lng: '-87.1914', name: 'Choluteca' },        // Choluteca
  '07': { lat: '14.0311', lng: '-86.5775', name: 'Yuscarán' },         // El Paraíso
  '08': { lat: '14.0723', lng: '-87.1921', name: 'Tegucigalpa' },      // Francisco Morazán
  '09': { lat: '15.0097', lng: '-84.9639', name: 'Puerto Lempira' },   // Gracias a Dios
  '10': { lat: '14.3167', lng: '-88.1667', name: 'La Esperanza' },     // Intibucá
  '11': { lat: '16.3097', lng: '-86.5419', name: 'Roatán' },           // Islas de la Bahía
  '12': { lat: '14.3167', lng: '-87.6833', name: 'La Paz' },           // La Paz
  '13': { lat: '14.5833', lng: '-88.6167', name: 'Gracias' },          // Lempira
  '14': { lat: '14.4333', lng: '-89.1833', name: 'Ocotepeque' },       // Ocotepeque
  '15': { lat: '14.8667', lng: '-86.0833', name: 'Juticalpa' },        // Olancho
  '16': { lat: '14.9167', lng: '-88.2167', name: 'Santa Bárbara' },    // Santa Bárbara
  '17': { lat: '13.3667', lng: '-87.6167', name: 'Nacaome' },          // Valle
  '18': { lat: '15.1333', lng: '-87.1333', name: 'Yoro' },             // Yoro
};

// Coordenadas de municipios principales (cabeceras y ciudades importantes)
const MUNICIPALITY_COORDINATES = {
  // Atlántida (01)
  '01-01': { lat: '15.7795', lng: '-86.8458', name: 'La Ceiba' },
  '01-07': { lat: '15.7774', lng: '-87.4579', name: 'Tela' },
  '01-08': { lat: '15.7167', lng: '-87.4333', name: 'Arizona' },
  '01-02': { lat: '15.8333', lng: '-86.9167', name: 'El Porvenir' },
  '01-03': { lat: '15.7500', lng: '-86.7500', name: 'Esparta' },
  '01-04': { lat: '15.8167', lng: '-86.7833', name: 'Jutiapa' },
  '01-05': { lat: '15.7333', lng: '-86.9333', name: 'La Masica' },
  '01-06': { lat: '15.7000', lng: '-87.1000', name: 'San Francisco' },

  // Colón (02)
  '02-01': { lat: '15.9167', lng: '-85.9333', name: 'Trujillo' },
  '02-02': { lat: '15.9167', lng: '-86.1500', name: 'Balfate' },
  '02-03': { lat: '15.7833', lng: '-85.2167', name: 'Iriona' },
  '02-04': { lat: '15.4500', lng: '-85.8167', name: 'Limón' },
  '02-05': { lat: '15.8500', lng: '-85.7167', name: 'Sabá' },
  '02-06': { lat: '15.9000', lng: '-85.8000', name: 'Santa Fe' },
  '02-07': { lat: '15.8167', lng: '-85.6500', name: 'Santa Rosa de Aguán' },
  '02-08': { lat: '15.6833', lng: '-85.4500', name: 'Sonaguera' },
  '02-09': { lat: '15.7500', lng: '-85.1333', name: 'Tocoa' },
  '02-10': { lat: '15.6167', lng: '-85.2833', name: 'Bonito Oriental' },

  // Comayagua (03)
  '03-01': { lat: '14.4603', lng: '-87.6423', name: 'Comayagua' },
  '03-18': { lat: '14.5935', lng: '-87.8439', name: 'Siguatepeque' },
  '03-17': { lat: '14.6000', lng: '-87.4500', name: 'Villa de San Antonio' },
  '03-02': { lat: '14.2500', lng: '-87.4167', name: 'Ajuterique' },
  '03-03': { lat: '14.7000', lng: '-87.3167', name: 'El Rosario' },
  '03-04': { lat: '14.3833', lng: '-87.8833', name: 'Esquías' },
  '03-05': { lat: '14.6833', lng: '-87.2000', name: 'Humuya' },
  '03-06': { lat: '14.3000', lng: '-87.9500', name: 'La Libertad' },
  '03-07': { lat: '14.5500', lng: '-87.3833', name: 'Lamaní' },
  '03-08': { lat: '14.4167', lng: '-87.3833', name: 'La Trinidad' },
  '03-09': { lat: '14.5000', lng: '-87.9000', name: 'Lejamaní' },
  '03-10': { lat: '14.8167', lng: '-87.4833', name: 'Meámbar' },
  '03-11': { lat: '14.7833', lng: '-87.7333', name: 'Minas de Oro' },
  '03-12': { lat: '14.7167', lng: '-87.9167', name: 'Ojos de Agua' },
  '03-13': { lat: '14.8833', lng: '-87.6167', name: 'San Jerónimo' },
  '03-14': { lat: '14.3500', lng: '-87.5500', name: 'San José de Comayagua' },
  '03-15': { lat: '14.6167', lng: '-87.7000', name: 'San José del Potrero' },
  '03-16': { lat: '14.5167', lng: '-87.5167', name: 'San Luis' },
  '03-19': { lat: '14.2833', lng: '-87.6167', name: 'Taulabé' },

  // Copán (04)
  '04-01': { lat: '14.7679', lng: '-89.1552', name: 'Santa Rosa de Copán' },
  '04-04': { lat: '14.8394', lng: '-89.1424', name: 'Copán Ruinas' },
  '04-02': { lat: '14.6500', lng: '-89.2167', name: 'Cabañas' },
  '04-03': { lat: '14.9167', lng: '-89.0833', name: 'Concepción' },
  '04-05': { lat: '14.8833', lng: '-89.3000', name: 'Corquín' },
  '04-06': { lat: '14.5833', lng: '-88.9667', name: 'Cucuyagua' },
  '04-07': { lat: '14.6333', lng: '-89.3500', name: 'Dolores' },
  '04-08': { lat: '14.5000', lng: '-89.1167', name: 'Dulce Nombre' },
  '04-09': { lat: '14.5167', lng: '-89.0333', name: 'El Paraíso' },
  '04-10': { lat: '14.7000', lng: '-88.9833', name: 'Florida' },
  '04-11': { lat: '14.8500', lng: '-89.2167', name: 'La Jigua' },
  '04-12': { lat: '14.6833', lng: '-89.0167', name: 'La Unión' },
  '04-13': { lat: '14.9333', lng: '-89.1500', name: 'Nueva Arcadia' },
  '04-14': { lat: '14.4667', lng: '-89.0000', name: 'San Agustín' },
  '04-15': { lat: '14.5833', lng: '-89.0833', name: 'San Antonio' },
  '04-16': { lat: '14.8167', lng: '-88.9500', name: 'San Jerónimo' },
  '04-17': { lat: '14.7167', lng: '-89.0500', name: 'San José' },
  '04-18': { lat: '14.5500', lng: '-89.2000', name: 'San Juan de Opoa' },
  '04-19': { lat: '14.4333', lng: '-89.0667', name: 'San Nicolás' },
  '04-20': { lat: '14.9000', lng: '-89.2500', name: 'San Pedro' },
  '04-21': { lat: '14.6167', lng: '-89.0667', name: 'Santa Rita' },
  '04-22': { lat: '14.8000', lng: '-89.3167', name: 'Trinidad de Copán' },
  '04-23': { lat: '14.4500', lng: '-89.1833', name: 'Veracruz' },

  // Cortés (05)
  '05-01': { lat: '15.5024', lng: '-88.0174', name: 'San Pedro Sula' },
  '05-02': { lat: '15.6108', lng: '-87.9539', name: 'Choloma' },
  '05-12': { lat: '15.4308', lng: '-87.9027', name: 'La Lima' },
  '05-03': { lat: '15.6000', lng: '-88.1833', name: 'La Entrada' },
  '05-04': { lat: '15.4167', lng: '-88.1167', name: 'Omoa' },
  '05-05': { lat: '15.5500', lng: '-88.2000', name: 'Pimienta' },
  '05-06': { lat: '15.6833', lng: '-88.0500', name: 'Potrerillos' },
  '05-07': { lat: '15.4833', lng: '-88.0500', name: 'Puerto Cortés' },
  '05-08': { lat: '15.5333', lng: '-88.1500', name: 'San Antonio de Cortés' },
  '05-09': { lat: '15.5667', lng: '-88.0833', name: 'San Francisco de Yojoa' },
  '05-10': { lat: '15.5167', lng: '-88.1333', name: 'San Manuel' },
  '05-11': { lat: '15.4500', lng: '-88.0167', name: 'Santa Cruz de Yojoa' },
  '05-13': { lat: '15.5833', lng: '-88.1167', name: 'Villanueva' },

  // Choluteca (06)
  '06-01': { lat: '13.3097', lng: '-87.1914', name: 'Choluteca' },
  '06-02': { lat: '13.2000', lng: '-87.0833', name: 'Apacilagua' },
  '06-03': { lat: '13.4333', lng: '-87.0500', name: 'Concepción de María' },
  '06-04': { lat: '13.4000', lng: '-87.3167', name: 'Duyure' },
  '06-05': { lat: '13.2833', lng: '-87.3500', name: 'El Corpus' },
  '06-06': { lat: '13.1167', lng: '-87.3833', name: 'El Triunfo' },
  '06-07': { lat: '13.3500', lng: '-87.2833', name: 'Marcovia' },
  '06-08': { lat: '13.1667', lng: '-87.2833', name: 'Morolica' },
  '06-09': { lat: '13.2167', lng: '-87.1500', name: 'Namasigüe' },
  '06-10': { lat: '13.1500', lng: '-87.4500', name: 'Orocuina' },
  '06-11': { lat: '13.2500', lng: '-87.2500', name: 'Pespire' },
  '06-12': { lat: '13.4167', lng: '-87.1167', name: 'San Antonio de Flores' },
  '06-13': { lat: '13.0833', lng: '-87.2333', name: 'San Isidro' },
  '06-14': { lat: '13.2333', lng: '-87.0167', name: 'San José' },
  '06-15': { lat: '13.3833', lng: '-87.1333', name: 'San Marcos de Colón' },
  '06-16': { lat: '13.1333', lng: '-87.1167', name: 'Santa Ana de Yusguare' },

  // El Paraíso (07)
  '07-03': { lat: '14.0311', lng: '-86.5775', name: 'Danlí' },
  '07-01': { lat: '13.9833', lng: '-86.4167', name: 'Alauca' },
  '07-02': { lat: '14.0167', lng: '-86.3333', name: 'Danlí' },
  '07-04': { lat: '13.7833', lng: '-86.5833', name: 'El Paraíso' },
  '07-05': { lat: '13.9667', lng: '-86.6833', name: 'Güinope' },
  '07-06': { lat: '14.0833', lng: '-86.7000', name: 'Jacaleapa' },
  '07-07': { lat: '13.8500', lng: '-86.6167', name: 'Liure' },
  '07-08': { lat: '13.8000', lng: '-86.7000', name: 'Morocelí' },
  '07-09': { lat: '13.9167', lng: '-86.7500', name: 'Oropolí' },
  '07-10': { lat: '13.8167', lng: '-86.5167', name: 'Potrerillos' },
  '07-11': { lat: '13.9500', lng: '-86.5167', name: 'San Antonio de Flores' },
  '07-12': { lat: '13.8833', lng: '-86.4833', name: 'San Lucas' },
  '07-13': { lat: '13.7167', lng: '-86.6000', name: 'San Matías' },
  '07-14': { lat: '13.9333', lng: '-86.6167', name: 'Soledad' },
  '07-15': { lat: '13.7500', lng: '-86.4500', name: 'Teupasenti' },
  '07-16': { lat: '13.8667', lng: '-86.5500', name: 'Texiguat' },
  '07-17': { lat: '13.7000', lng: '-86.5167', name: 'Vado Ancho' },
  '07-18': { lat: '13.9000', lng: '-86.8000', name: 'Yauyupe' },
  '07-19': { lat: '14.0000', lng: '-86.8167', name: 'Yuscarán' },

  // Francisco Morazán (08)
  '08-01': { lat: '14.0723', lng: '-87.1921', name: 'Distrito Central' },
  '08-02': { lat: '14.3167', lng: '-87.0500', name: 'Alubarén' },
  '08-03': { lat: '14.2000', lng: '-86.9000', name: 'Cedros' },
  '08-04': { lat: '14.4333', lng: '-87.1833', name: 'Curarén' },
  '08-05': { lat: '14.2833', lng: '-87.0167', name: 'El Porvenir' },
  '08-06': { lat: '14.4000', lng: '-87.0667', name: 'Guaimaca' },
  '08-07': { lat: '14.1167', lng: '-86.9833', name: 'La Libertad' },
  '08-08': { lat: '14.3500', lng: '-87.1167', name: 'La Venta' },
  '08-09': { lat: '14.1833', lng: '-87.0667', name: 'Lepaterique' },
  '08-10': { lat: '14.3833', lng: '-86.9833', name: 'Maraita' },
  '08-11': { lat: '14.1500', lng: '-86.8833', name: 'Marale' },
  '08-12': { lat: '14.4167', lng: '-87.0167', name: 'Nueva Armenia' },
  '08-13': { lat: '14.2167', lng: '-87.1167', name: 'Ojojona' },
  '08-14': { lat: '14.3000', lng: '-87.2167', name: 'Orica' },
  '08-15': { lat: '14.2500', lng: '-87.1833', name: 'Reitoca' },
  '08-16': { lat: '14.1333', lng: '-87.1333', name: 'Sabanagrande' },
  '08-17': { lat: '14.3667', lng: '-86.8833', name: 'San Antonio de Oriente' },
  '08-18': { lat: '14.1000', lng: '-86.9167', name: 'San Buenaventura' },
  '08-19': { lat: '14.1667', lng: '-87.0167', name: 'San Ignacio' },
  '08-20': { lat: '14.2333', lng: '-86.9667', name: 'San Juan de Flores' },
  '08-21': { lat: '14.4500', lng: '-86.9167', name: 'San Miguelito' },
  '08-22': { lat: '14.1833', lng: '-86.9167', name: 'Santa Ana' },
  '08-23': { lat: '14.3833', lng: '-87.2000', name: 'Santa Lucía' },
  '08-24': { lat: '14.4667', lng: '-87.1000', name: 'Talanga' },
  '08-25': { lat: '14.2667', lng: '-86.9333', name: 'Tatumbla' },
  '08-26': { lat: '14.1167', lng: '-87.0500', name: 'Valle de Ángeles' },
  '08-27': { lat: '14.3333', lng: '-86.9500', name: 'Villa de San Francisco' },
  '08-28': { lat: '14.2833', lng: '-87.1500', name: 'Vallecillo' },

  // Más municipios se pueden agregar aquí...
  // Para este script inicial, agregamos las principales cabeceras
};

// Database connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

console.log('🗺️  Actualizando coordenadas de departamentos y municipios...\n');

async function updateDepartmentCoordinates() {
  console.log('📍 Actualizando coordenadas de departamentos...');
  
  for (const [deptId, coords] of Object.entries(DEPARTMENT_COORDINATES)) {
    try {
      await db.update(departments)
        .set({
          latitude: coords.lat,
          longitude: coords.lng
        })
        .where(eq(departments.id, deptId));
      
      console.log(`✅ Departamento ${deptId}: ${coords.name} (${coords.lat}, ${coords.lng})`);
    } catch (error) {
      console.error(`❌ Error updating department ${deptId}:`, error.message);
    }
  }
  
  console.log('\n');
}

async function updateMunicipalityCoordinates() {
  console.log('🏘️  Actualizando coordenadas de municipios...');
  
  for (const [muniCode, coords] of Object.entries(MUNICIPALITY_COORDINATES)) {
    try {
      // Convertir "01-08" a departamento "01" y municipio "08"
      const [deptId, muniId] = muniCode.split('-');
      
      // Actualizar usando el ID completo del municipio "01-08"
      const updateResult = await db.update(municipalities)
        .set({
          latitude: coords.lat,
          longitude: coords.lng
        })
        .where(eq(municipalities.id, muniCode));
      
      console.log(`✅ Municipio ${muniCode}: ${coords.name} (${coords.lat}, ${coords.lng})`);
    } catch (error) {
      console.error(`❌ Error updating municipality ${muniCode}:`, error.message);
    }
  }
  
  console.log('\n');
}

async function main() {
  try {
    await updateDepartmentCoordinates();
    await updateMunicipalityCoordinates();
    
    console.log('🎉 Coordenadas actualizadas exitosamente!');
    console.log(`📊 Departamentos actualizados: ${Object.keys(DEPARTMENT_COORDINATES).length}`);
    console.log(`🏘️  Municipios actualizados: ${Object.keys(MUNICIPALITY_COORDINATES).length}`);
    
  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    await pool.end();
  }
}

main();