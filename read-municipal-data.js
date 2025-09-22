import XLSX from 'xlsx';
import fs from 'fs';

try {
  // Read the Excel file with municipal codes
  const workbook = XLSX.readFile('attached_assets/Codificacion-Municipal-de-Honduras_1758565952760.xlsX');
  
  // Get first worksheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('🏘️ Datos municipales encontrados:', data.length, 'registros');
  console.log('\n📋 Estructura de las primeras filas:');
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
  
  console.log('\n🔑 Columnas disponibles:');
  if (data.length > 0) {
    console.log(Object.keys(data[0]));
  }
  
  // Group by department to verify relationships
  const byDepartment = {};
  data.forEach(row => {
    const deptCode = String(row['Código del Departamento'] || row['Cod_Dept'] || '').padStart(2, '0');
    if (!byDepartment[deptCode]) {
      byDepartment[deptCode] = [];
    }
    byDepartment[deptCode].push(row);
  });
  
  console.log('\n📊 Municipios por departamento:');
  Object.keys(byDepartment).sort().forEach(deptCode => {
    console.log(`Departamento ${deptCode}: ${byDepartment[deptCode].length} municipios`);
  });
  
  // Save to JSON for processing
  fs.writeFileSync('municipal-data.json', JSON.stringify(data, null, 2));
  console.log('\n✅ Datos guardados en municipal-data.json');
  
} catch (error) {
  console.error('❌ Error al leer el archivo Excel:', error.message);
}