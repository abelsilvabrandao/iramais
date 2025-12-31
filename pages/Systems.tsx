
import React, { useState, useEffect } from 'react';
import { fetchSystems } from '../services/firebaseService';
import { SystemTool } from '../types';
import { Search, ExternalLink, LayoutGrid, Filter, Loader2 } from 'lucide-react';

const Systems: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [systems, setSystems] = useState<SystemTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulation of logged-in user context
  // In a real app, this would come from AuthContext
  const currentUser = {
    name: 'Abel Silva',
    department: 'TI' // Change this to test filtering (e.g., 'TI')
  };

  useEffect(() => {
    const loadSystems = async () => {
      setIsLoading(true);
      try {
        const allSystems = await fetchSystems();
        // Filter locally based on permissions
        const allowedSystems = allSystems.filter(sys => 
            sys.allowedDepartments.includes('Todos') || 
            sys.allowedDepartments.includes(currentUser.department)
        );
        setSystems(allowedSystems);
      } catch (error) {
        console.error("Erro ao carregar sistemas", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSystems();
  }, []);

  const categories = ['Todos', ...Array.from(new Set(systems.map(s => s.category)))];

  const filteredSystems = systems.filter(sys => {
    const matchesSearch = sys.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sys.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || sys.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutGrid className="text-emerald-600" /> Meus Sistemas & Links
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Exibindo ferramentas liberadas para: <span className="font-bold text-emerald-700">{currentUser.department}</span>
          </p>
        </div>
        
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar sistema..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-64 shadow-sm"
          />
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeCategory === cat 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSystems.map(system => (
          <div key={system.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
               <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                 <img src={system.logo} alt={system.name} className="w-full h-full object-cover" />
               </div>
               <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">
                 {system.category}
               </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">{system.name}</h3>
            <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">{system.description}</p>
            
            <a 
              href={system.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-emerald-600 hover:text-white transition-all duration-200 group-hover:shadow-md"
            >
              Acessar <ExternalLink size={14} />
            </a>
          </div>
        ))}

        {filteredSystems.length === 0 && (
           <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
             <Filter size={48} className="mx-auto mb-4 opacity-20" />
             <p className="text-lg font-medium">Nenhum sistema encontrado.</p>
             <p className="text-sm mt-2 max-w-md mx-auto">
               Você está visualizando apenas os sistemas liberados para <strong>{currentUser.department}</strong>.
               Se precisar de acesso a outro sistema, contate o Suporte TI.
             </p>
             {searchTerm && (
                <button 
                  onClick={() => {setSearchTerm(''); setActiveCategory('Todos')}}
                  className="mt-4 text-emerald-600 text-sm font-medium hover:underline"
                >
                  Limpar filtros de busca
                </button>
             )}
           </div>
        )}
      </div>
    </div>
  );
};

export default Systems;
