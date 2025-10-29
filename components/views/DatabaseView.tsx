
import React from 'react';
import { residentsData } from '../../data/mockData';
import { Resident } from '../../types';

const DatabaseView: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Base de Datos de Residentes</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Cargar Información</h3>
        <p className="text-sm text-gray-600 mb-4">
          Sube un archivo de Excel o Google Sheets para actualizar la base de datos de residentes, proveedores o estados de cuenta. El sistema leerá el archivo y migrará los datos.
        </p>
        <div className="flex items-center gap-4">
            <input type="file" className="text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
                accept=".xlsx, .xls, .csv"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Subir Archivo
            </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3">Apartamento</th>
                        <th scope="col" className="px-6 py-3">Nombre</th>
                        <th scope="col" className="px-6 py-3">Correo</th>
                        <th scope="col" className="px-6 py-3">Teléfono</th>
                        <th scope="col" className="px-6 py-3">Estado</th>
                        <th scope="col" className="px-6 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {residentsData.map((resident: Resident) => (
                        <tr key={resident.apartment} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{resident.apartment}</td>
                            <td className="px-6 py-4">{resident.name}</td>
                            <td className="px-6 py-4">{resident.email}</td>
                            <td className="px-6 py-4">{resident.phone}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    resident.status === 'Al día' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {resident.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <a href="#" className="font-medium text-blue-600 hover:underline">Editar</a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default DatabaseView;
