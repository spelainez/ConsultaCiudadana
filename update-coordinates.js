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
  '03-20': { lat: '14.7333', lng: '-87.3833', name: 'Las Lajas' },
  '03-21': { lat: '14.2833', lng: '-87.6167', name: 'Taulabé' },

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

  // Gracias a Dios (09) 
  '09-01': { lat: '15.0097', lng: '-84.9639', name: 'Puerto Lempira' },
  '09-02': { lat: '15.1833', lng: '-84.2833', name: 'Brus Laguna' },
  '09-03': { lat: '14.8167', lng: '-84.3167', name: 'Ahuas' },
  '09-04': { lat: '15.0333', lng: '-84.6000', name: 'Juan Francisco Bulnes' },
  '09-05': { lat: '15.2833', lng: '-84.6833', name: 'Ramón Villeda Morales' },
  '09-06': { lat: '14.9833', lng: '-84.1833', name: 'Wampusirpi' },

  // Intibucá (10)
  '10-01': { lat: '14.3167', lng: '-88.1667', name: 'La Esperanza' },
  '10-02': { lat: '14.4667', lng: '-88.0833', name: 'Camasca' },
  '10-03': { lat: '14.2833', lng: '-88.0500', name: 'Colomoncagua' },
  '10-04': { lat: '14.2000', lng: '-88.1000', name: 'Concepción' },
  '10-05': { lat: '14.3500', lng: '-88.0333', name: 'Dolores' },
  '10-06': { lat: '14.4000', lng: '-88.1167', name: 'Intibucá' },
  '10-07': { lat: '14.3333', lng: '-88.2167', name: 'Jesús de Otoro' },
  '10-08': { lat: '14.4833', lng: '-88.1500', name: 'Magdalena' },
  '10-09': { lat: '14.1667', lng: '-88.0833', name: 'Masaguara' },
  '10-10': { lat: '14.2667', lng: '-88.1833', name: 'San Antonio' },
  '10-11': { lat: '14.1833', lng: '-88.1167', name: 'San Isidro' },
  '10-12': { lat: '14.3833', lng: '-88.2500', name: 'San Juan' },
  '10-13': { lat: '14.2500', lng: '-88.0333', name: 'San Marcos de la Sierra' },
  '10-14': { lat: '14.1833', lng: '-88.2000', name: 'San Miguelito' },
  '10-15': { lat: '14.1500', lng: '-88.1333', name: 'Santa Lucía' },
  '10-16': { lat: '14.4500', lng: '-88.2000', name: 'Yamaranguila' },
  '10-17': { lat: '14.2167', lng: '-88.2167', name: 'San Francisco de Opalaca' },

  // Islas de la Bahía (11)
  '11-01': { lat: '16.3097', lng: '-86.5419', name: 'Roatán' },
  '11-02': { lat: '16.3833', lng: '-86.9167', name: 'Guanaja' },
  '11-03': { lat: '16.1667', lng: '-86.6167', name: 'José Santos Guardiola' },
  '11-04': { lat: '16.4833', lng: '-86.8667', name: 'Utila' },

  // La Paz (12)
  '12-01': { lat: '14.3167', lng: '-87.6833', name: 'La Paz' },
  '12-02': { lat: '14.2333', lng: '-87.6167', name: 'Aguantequerique' },
  '12-03': { lat: '14.1667', lng: '-87.6333', name: 'Cabañas' },
  '12-04': { lat: '14.2667', lng: '-87.5833', name: 'Cane' },
  '12-05': { lat: '14.4333', lng: '-87.6500', name: 'Chinacla' },
  '12-06': { lat: '14.4000', lng: '-87.5833', name: 'Guajiquiro' },
  '12-07': { lat: '14.1833', lng: '-87.7167', name: 'Lauterique' },
  '12-08': { lat: '14.3833', lng: '-87.5500', name: 'Marcala' },
  '12-09': { lat: '14.2833', lng: '-87.7000', name: 'Mercedes de Oriente' },
  '12-10': { lat: '14.1333', lng: '-87.5667', name: 'Opatoro' },
  '12-11': { lat: '14.2000', lng: '-87.5333', name: 'San Antonio del Norte' },
  '12-12': { lat: '14.3500', lng: '-87.6167', name: 'San José' },
  '12-13': { lat: '14.4167', lng: '-87.7000', name: 'San Juan' },
  '12-14': { lat: '14.2500', lng: '-87.5167', name: 'San Pedro de Tutule' },
  '12-15': { lat: '14.1167', lng: '-87.6833', name: 'Santa Ana' },
  '12-16': { lat: '14.3667', lng: '-87.7333', name: 'Santa Elena' },
  '12-17': { lat: '14.2167', lng: '-87.7500', name: 'Santa María' },
  '12-18': { lat: '14.4500', lng: '-87.5833', name: 'Santiago de Puringla' },
  '12-19': { lat: '14.1500', lng: '-87.7333', name: 'Yarula' },

  // Lempira (13)
  '13-01': { lat: '14.5833', lng: '-88.6167', name: 'Gracias' },
  '13-02': { lat: '14.4833', lng: '-88.4833', name: 'Belén' },
  '13-03': { lat: '14.3667', lng: '-88.4167', name: 'Candelaria' },
  '13-04': { lat: '14.6167', lng: '-88.5833', name: 'Cololaca' },
  '13-05': { lat: '14.5000', lng: '-88.5167', name: 'Erandique' },
  '13-06': { lat: '14.6833', lng: '-88.4500', name: 'Gualcince' },
  '13-07': { lat: '14.4167', lng: '-88.5500', name: 'Guarita' },
  '13-08': { lat: '14.7167', lng: '-88.5833', name: 'La Campa' },
  '13-09': { lat: '14.6500', lng: '-88.7000', name: 'La Iguala' },
  '13-10': { lat: '14.5167', lng: '-88.7167', name: 'Las Flores' },
  '13-11': { lat: '14.6333', lng: '-88.4833', name: 'Lepaera' },
  '13-12': { lat: '14.4500', lng: '-88.6167', name: 'Mapulaca' },
  '13-13': { lat: '14.5500', lng: '-88.4500', name: 'Piraera' },
  '13-14': { lat: '14.7000', lng: '-88.6500', name: 'San Andrés' },
  '13-15': { lat: '14.3833', lng: '-88.4833', name: 'San Francisco' },
  '13-16': { lat: '14.4333', lng: '-88.4333', name: 'San Juan Guarita' },
  '13-17': { lat: '14.3500', lng: '-88.5167', name: 'San Manuel Colohete' },
  '13-18': { lat: '14.6167', lng: '-88.6333', name: 'San Rafael' },
  '13-19': { lat: '14.3333', lng: '-88.4667', name: 'San Sebastián' },
  '13-20': { lat: '14.7500', lng: '-88.6167', name: 'Santa Cruz' },
  '13-21': { lat: '14.5667', lng: '-88.7333', name: 'Talgua' },
  '13-22': { lat: '14.4667', lng: '-88.6833', name: 'Tambla' },
  '13-23': { lat: '14.3167', lng: '-88.5833', name: 'Tomalá' },
  '13-24': { lat: '14.6667', lng: '-88.5167', name: 'Valladolid' },
  '13-25': { lat: '14.5833', lng: '-88.5500', name: 'Virginia' },
  '13-26': { lat: '14.6000', lng: '-88.4167', name: 'San Marcos de Caiquín' },
  '13-27': { lat: '14.7333', lng: '-88.5500', name: 'La Virtud' },
  '13-28': { lat: '14.4000', lng: '-88.6500', name: 'La Unión' },

  // Ocotepeque (14)
  '14-01': { lat: '14.4333', lng: '-89.1833', name: 'Ocotepeque' },
  '14-02': { lat: '14.3833', lng: '-89.2333', name: 'Belén Gualcho' },
  '14-03': { lat: '14.3167', lng: '-89.1500', name: 'Concepción' },
  '14-04': { lat: '14.5167', lng: '-89.2167', name: 'Dolores Merendón' },
  '14-05': { lat: '14.4667', lng: '-89.2333', name: 'Fraternidad' },
  '14-06': { lat: '14.3667', lng: '-89.1167', name: 'La Encarnación' },
  '14-07': { lat: '14.2833', lng: '-89.2000', name: 'La Labor' },
  '14-08': { lat: '14.4000', lng: '-89.1333', name: 'Lucerna' },
  '14-09': { lat: '14.3500', lng: '-89.2167', name: 'Mercedes' },
  '14-10': { lat: '14.5000', lng: '-89.1500', name: 'San Fernando' },
  '14-11': { lat: '14.2667', lng: '-89.1333', name: 'San Francisco del Valle' },
  '14-12': { lat: '14.3000', lng: '-89.1167', name: 'San Jorge' },
  '14-13': { lat: '14.5333', lng: '-89.1667', name: 'San Marcos' },
  '14-14': { lat: '14.2500', lng: '-89.1667', name: 'Santa Fe' },
  '14-15': { lat: '14.4833', lng: '-89.1333', name: 'Sensenti' },
  '14-16': { lat: '14.3333', lng: '-89.0833', name: 'Sinuapa' },

  // Olancho (15)
  '15-01': { lat: '14.8667', lng: '-86.0833', name: 'Juticalpa' },
  '15-02': { lat: '14.9333', lng: '-85.9167', name: 'Catacamas' },
  '15-03': { lat: '14.6333', lng: '-85.4833', name: 'Dulce Nombre de Culmí' },
  '15-04': { lat: '14.9167', lng: '-85.5167', name: 'El Rosario' },
  '15-05': { lat: '14.7833', lng: '-85.9833', name: 'Esquipulas del Norte' },
  '15-06': { lat: '14.7167', lng: '-85.8500', name: 'Gualaco' },
  '15-07': { lat: '14.8333', lng: '-85.7167', name: 'Guarizama' },
  '15-08': { lat: '14.9833', lng: '-85.8333', name: 'Guata' },
  '15-09': { lat: '14.8000', lng: '-85.6833', name: 'Guayape' },
  '15-10': { lat: '14.6167', lng: '-85.6167', name: 'Jano' },
  '15-11': { lat: '14.7500', lng: '-85.7333', name: 'La Unión' },
  '15-12': { lat: '14.6833', lng: '-85.7667', name: 'Mangulile' },
  '15-13': { lat: '14.5833', lng: '-85.5833', name: 'Manto' },
  '15-14': { lat: '14.8167', lng: '-85.5500', name: 'Salamá' },
  '15-15': { lat: '14.6000', lng: '-85.8167', name: 'San Esteban' },
  '15-16': { lat: '14.7000', lng: '-85.6333', name: 'San Francisco de Becerra' },
  '15-17': { lat: '14.5667', lng: '-85.7000', name: 'San Francisco de la Paz' },
  '15-18': { lat: '14.6667', lng: '-85.5167', name: 'Santa María del Real' },
  '15-19': { lat: '14.8500', lng: '-85.8667', name: 'Silca' },
  '15-20': { lat: '14.9500', lng: '-85.7000', name: 'Yocón' },
  '15-21': { lat: '14.7333', lng: '-85.5667', name: 'Patuca' },
  '15-22': { lat: '14.8833', lng: '-85.6333', name: 'San José del Potrero' },
  '15-23': { lat: '14.5500', lng: '-85.6500', name: 'Mezapa' },

  // Santa Bárbara (16)
  '16-01': { lat: '14.9167', lng: '-88.2167', name: 'Santa Bárbara' },
  '16-02': { lat: '15.0167', lng: '-88.1333', name: 'Arada' },
  '16-03': { lat: '14.8167', lng: '-88.3333', name: 'Atima' },
  '16-04': { lat: '14.9833', lng: '-88.3167', name: 'Azacualpa' },
  '16-05': { lat: '14.8833', lng: '-88.1833', name: 'Ceguaca' },
  '16-06': { lat: '14.8500', lng: '-88.2833', name: 'Concepción del Norte' },
  '16-07': { lat: '14.8000', lng: '-88.2167', name: 'Concepción del Sur' },
  '16-08': { lat: '15.0500', lng: '-88.2000', name: 'Chinda' },
  '16-09': { lat: '14.9500', lng: '-88.2833', name: 'El Níspero' },
  '16-10': { lat: '14.7833', lng: '-88.3167', name: 'Gualala' },
  '16-11': { lat: '15.0333', lng: '-88.1667', name: 'Ilama' },
  '16-12': { lat: '14.8667', lng: '-88.2500', name: 'Las Vegas' },
  '16-13': { lat: '14.7667', lng: '-88.2333', name: 'Macuelizo' },
  '16-14': { lat: '14.7500', lng: '-88.2833', name: 'Naranjito' },
  '16-15': { lat: '14.9667', lng: '-88.1833', name: 'Nuevo Celilac' },
  '16-16': { lat: '15.0000', lng: '-88.2500', name: 'Petoa' },
  '16-17': { lat: '14.9000', lng: '-88.3000', name: 'Protección' },
  '16-18': { lat: '15.0167', lng: '-88.2333', name: 'Quimistán' },
  '16-19': { lat: '14.8333', lng: '-88.3667', name: 'San Francisco de Ojuera' },
  '16-20': { lat: '14.8000', lng: '-88.1500', name: 'San José de Colinas' },
  '16-21': { lat: '14.7167', lng: '-88.1833', name: 'San Luis' },
  '16-22': { lat: '14.7333', lng: '-88.3500', name: 'San Marcos' },
  '16-23': { lat: '14.9333', lng: '-88.1167', name: 'San Nicolás' },
  '16-24': { lat: '14.7000', lng: '-88.2500', name: 'San Pedro Zacapa' },
  '16-25': { lat: '14.8667', lng: '-88.3833', name: 'San Vicente Centenario' },
  '16-26': { lat: '14.9833', lng: '-88.2667', name: 'Santa Rita' },
  '16-27': { lat: '14.8500', lng: '-88.1667', name: 'Trinidad' },
  '16-28': { lat: '14.7833', lng: '-88.1667', name: 'Colinas' },

  // Valle (17)
  '17-01': { lat: '13.3667', lng: '-87.6167', name: 'Nacaome' },
  '17-02': { lat: '13.4167', lng: '-87.5333', name: 'Alianza' },
  '17-03': { lat: '13.3167', lng: '-87.7333', name: 'Amapala' },
  '17-04': { lat: '13.4333', lng: '-87.6000', name: 'Aramecina' },
  '17-05': { lat: '13.4000', lng: '-87.7000', name: 'Caridad' },
  '17-06': { lat: '13.3333', lng: '-87.5167', name: 'Goascorán' },
  '17-07': { lat: '13.4500', lng: '-87.5167', name: 'Langue' },
  '17-08': { lat: '13.3833', lng: '-87.5833', name: 'San Francisco de Coray' },
  '17-09': { lat: '13.4667', lng: '-87.6500', name: 'San Lorenzo' },

  // Yoro (18)
  '18-01': { lat: '15.1333', lng: '-87.1333', name: 'Yoro' },
  '18-02': { lat: '15.2833', lng: '-87.3500', name: 'Arenal' },
  '18-03': { lat: '15.2167', lng: '-87.2167', name: 'El Negrito' },
  '18-04': { lat: '15.4000', lng: '-87.8167', name: 'El Progreso' },
  '18-05': { lat: '15.1667', lng: '-87.0833', name: 'Jocón' },
  '18-06': { lat: '15.3333', lng: '-87.6000', name: 'Morazán' },
  '18-07': { lat: '15.2000', lng: '-87.3333', name: 'Olanchito' },
  '18-08': { lat: '15.1167', lng: '-87.2833', name: 'Santa Rita' },
  '18-09': { lat: '15.0833', lng: '-87.2000', name: 'Sulaco' },
  '18-10': { lat: '15.3167', lng: '-87.4500', name: 'Victoria' },
  '18-11': { lat: '15.2500', lng: '-87.1500', name: 'Yorito' },

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