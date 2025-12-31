
import React, { useState, useEffect } from 'react';
import { BlockType, ContentBlock, StyleConfig, NewsArticle } from '../types';
// Fix: Added AlertCircle to lucide-react imports
import { Plus, Trash2, Image as ImageIcon, Type, Quote, Settings, Wand2, Eye, EyeOff, Save, Tag, Link as LinkIcon, ExternalLink, Loader2, List, PlusCircle, Edit, Calendar, X, ChevronUp, ChevronDown, LayoutTemplate, ArrowLeftRight, Globe, Lock, AlertCircle } from 'lucide-react';
import { generateNewsContent } from '../services/geminiService';
import { addNews, fetchNews, updateNews, deleteNews } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NewsEditor: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');
  const [myPosts, setMyPosts] = useState<NewsArticle[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Geral');
  const [isPublic, setIsPublic] = useState(true); // Novo estado de visibilidade
  const [thumbnail, setThumbnail] = useState('https://picsum.photos/800/400');
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: '1', type: 'header', content: 'Novo Título', style: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937' } },
    { id: '2', type: 'paragraph', content: 'Comece a escrever sua notícia...', style: { fontSize: '16px', color: '#4b5563', textAlign: 'left' } }
  ]);
  const [isPreview, setIsPreview] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'list') {
      loadMyPosts();
    }
  }, [activeTab, currentUser]);

  const loadMyPosts = async () => {
    if (!currentUser) return;
    setIsLoadingPosts(true);
    try {
      const allNews = await fetchNews();
      // Filtra por authorUid para garantir que o usuário veja seus posts mesmo se mudar de nome
      const mine = allNews.filter(n => n.authorUid === currentUser.uid || n.author === currentUser.name);
      setMyPosts(mine);
    } catch (error) {
      console.error("Erro ao carregar posts", error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleEditPost = (post: NewsArticle) => {
    setEditingId(post.id);
    setTitle(post.title);
    setCategory(post.category);
    setIsPublic(post.isPublic ?? true);
    setThumbnail(post.thumbnail);
    setBlocks(post.blocks);
    setActiveTab('editor');
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta publicação?")) {
      try {
        await deleteNews(id);
        loadMyPosts();
      } catch (error) {
        alert("Erro ao excluir postagem.");
      }
    }
  };

  const handleNewPost = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Geral');
    setIsPublic(true);
    setThumbnail('https://picsum.photos/800/400');
    setBlocks([
      { id: '1', type: 'header', content: 'Novo Título', style: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937' } },
      { id: '2', type: 'paragraph', content: 'Comece a escrever sua notícia...', style: { fontSize: '16px', color: '#4b5563', textAlign: 'left' } }
    ]);
    setActiveTab('editor');
  };

  const addBlock = (type: BlockType) => {
    let newContent = 'Novo bloco...';
    let newStyle: StyleConfig = { fontSize: '16px', color: '#333' };
    let newUrl = '';

    if (type === 'image') {
      newContent = 'https://picsum.photos/800/400';
    } else if (type === 'header') {
      newContent = 'Novo Título';
      newStyle = { fontSize: '20px', fontWeight: 'bold', color: '#111827' };
    } else if (type === 'button') {
      newContent = 'Clique Aqui';
      newUrl = 'https://google.com';
      newStyle = { 
        backgroundColor: '#059669',
        color: '#ffffff', 
        fontSize: '14px', 
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '12px 24px',
        borderRadius: '8px'
      };
    } else if (type === 'side-by-side') {
      newContent = 'Descreva aqui o conteúdo que ficará ao lado da imagem.';
      newUrl = 'https://picsum.photos/600/400';
      newStyle = { layoutDirection: 'row' };
    }

    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: newContent,
      url: newUrl || undefined,
      style: newStyle
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
    }
    setBlocks(newBlocks);
  };

  const updateBlockContent = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const updateBlockUrl = (id: string, url: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, url } : b));
  };

  const updateBlockStyle = (id: string, styleUpdate: Partial<StyleConfig>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, style: { ...b.style, ...styleUpdate } } : b));
  };

  const handleSmartGenerate = async () => {
    if (!geminiPrompt) return;
    setIsGenerating(true);
    const generatedText = await generateNewsContent(geminiPrompt);
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type: 'paragraph',
      content: generatedText,
      style: { fontSize: '16px', color: '#4b5563' }
    };
    setBlocks([...blocks, newBlock]);
    setIsGenerating(false);
    setGeminiPrompt('');
  };

  const handleSavePost = async () => {
    if (!title) return alert('O título é obrigatório');
    if (!currentUser) return alert('Você precisa estar logado para publicar');
    
    setIsSaving(true);
    try {
      const sanitizedBlocks = blocks.map(b => ({
        ...b,
        url: b.url || null,
        style: { ...b.style }
      }));

      const postData = {
        title,
        category,
        isPublic, // Salva o estado de visibilidade
        thumbnail,
        blocks: sanitizedBlocks,
        date: new Date().toISOString(),
        published: true,
        author: currentUser.name,
        authorUid: currentUser.uid, // Salva o UID estável
        authorAvatar: currentUser.avatar || null,
        externalUrl: null
      };

      if (editingId) {
        await updateNews(editingId, postData);
        alert('Postagem atualizada com sucesso!');
      } else {
        await addNews(postData);
        alert('Postagem publicada com sucesso!');
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Erro ao salvar post:", error);
      alert(`Erro ao salvar postagem: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditBlock = (block: ContentBlock, index: number) => {
    const inputStyle = "w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all outline-none";
    
    return (
      <div key={block.id} className="relative group border border-slate-100 hover:border-emerald-300 rounded-2xl p-5 bg-white transition-all shadow-sm">
        {/* Block Controls */}
        <div className="absolute -top-3 right-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-xl rounded-full px-3 py-1.5 border border-slate-200 z-20">
          <div className="flex gap-0.5 mr-2 pr-2 border-r border-slate-100">
             <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20"><ChevronUp size={16}/></button>
             <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20"><ChevronDown size={16}/></button>
          </div>
          
          <button onClick={() => removeBlock(block.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remover"><Trash2 size={16}/></button>
          
          {block.type === 'side-by-side' && (
             <button 
               onClick={() => updateBlockStyle(block.id, { layoutDirection: block.style.layoutDirection === 'row' ? 'row-reverse' : 'row' })}
               className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1 text-xs font-bold"
               title="Inverter Lados"
             >
               <ArrowLeftRight size={14}/> Inverter
             </button>
          )}

          {block.type !== 'image' && block.type !== 'button' && block.type !== 'side-by-side' && (
             <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-100">
               <input 
                  type="color" 
                  value={block.style.color || '#000000'} 
                  onChange={(e) => updateBlockStyle(block.id, { color: e.target.value })}
                  className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer shadow-sm"
                  title="Cor do Texto"
               />
             </div>
          )}
        </div>

        {/* Content Input UI */}
        <div className="space-y-4">
          {block.type === 'image' ? (
             <div className="space-y-2">
               <div className="bg-slate-50 h-48 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                  <img src={block.content} alt="Preview" className="h-full object-cover" />
               </div>
               <div className="relative">
                  <ImageIcon className="absolute left-3 top-3 text-slate-400" size={16}/>
                  <input 
                    type="text" 
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    className={`${inputStyle} pl-10`}
                    placeholder="URL da Imagem..."
                  />
               </div>
             </div>
          ) : block.type === 'side-by-side' ? (
             <div className={`flex flex-col md:flex-row gap-6 items-center ${block.style.layoutDirection === 'row-reverse' ? 'md:flex-row-reverse' : ''}`}>
                <div className="w-full md:w-1/2 space-y-2">
                   <div className="aspect-video bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                      <img src={block.url} alt="" className="w-full h-full object-cover" />
                   </div>
                   <div className="relative">
                      <ImageIcon className="absolute left-3 top-3 text-slate-400" size={16}/>
                      <input 
                        type="text" 
                        value={block.url || ''}
                        onChange={(e) => updateBlockUrl(block.id, e.target.value)}
                        className={`${inputStyle} pl-10 text-xs`}
                        placeholder="URL da Imagem lateral..."
                      />
                   </div>
                </div>
                <div className="w-full md:w-1/2">
                   <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Texto Lateral</label>
                   <textarea
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      className={`${inputStyle} min-h-[140px]`}
                      placeholder="Escreva aqui..."
                   />
                </div>
             </div>
          ) : block.type === 'button' ? (
             <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Texto do Botão</label>
                     <div className="relative">
                        <Type className="absolute left-3 top-3 text-slate-400" size={16}/>
                        <input 
                          type="text"
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className={`${inputStyle} pl-10`}
                          placeholder="Ex: Acessar Link"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Link de Destino (URL)</label>
                     <div className="relative">
                       <ExternalLink className="absolute left-3 top-3 text-slate-400" size={16} />
                       <input 
                          type="text"
                          value={block.url || ''}
                          onChange={(e) => updateBlockUrl(block.id, e.target.value)}
                          className={`${inputStyle} pl-10`}
                          placeholder="Ex: https://..."
                       />
                     </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-center shadow-inner">
                   <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Estilo do Botão:</span>
                      <input type="color" value={block.style.backgroundColor || '#059669'} onChange={(e) => updateBlockStyle(block.id, { backgroundColor: e.target.value })} className="w-8 h-8 p-0 border-0 rounded-lg cursor-pointer shadow-sm" title="Cor de Fundo"/>
                      <input type="color" value={block.style.color || '#ffffff'} onChange={(e) => updateBlockStyle(block.id, { color: e.target.value })} className="w-8 h-8 p-0 border-0 rounded-lg cursor-pointer shadow-sm" title="Cor do Texto"/>
                      <div className="h-8 w-px bg-slate-200 mx-2"></div>
                      <div className="px-4 py-2 rounded-lg text-sm font-bold shadow-sm" style={{ backgroundColor: block.style.backgroundColor, color: block.style.color }}>
                        {block.content || 'Preview'}
                      </div>
                   </div>
                </div>
             </div>
          ) : (
            <textarea
              value={block.content}
              onChange={(e) => updateBlockContent(block.id, e.target.value)}
              style={{ ...block.style }}
              className={`${inputStyle} resize-y min-h-[100px] border-none bg-transparent shadow-none focus:ring-0 px-0`}
              placeholder={block.type === 'header' ? 'Digite o título aqui...' : 'Escreva o parágrafo aqui...'}
            />
          )}
        </div>
        
        <div className="absolute bottom-2 right-4 text-[9px] uppercase text-slate-300 font-black tracking-[0.2em] pointer-events-none select-none flex items-center gap-1">
          {block.type}
        </div>
      </div>
    );
  };

  const renderPreviewBlock = (block: ContentBlock) => {
    const commonStyle = { ...block.style };
    
    switch (block.type) {
      case 'header':
        return <h2 key={block.id} style={commonStyle} className="mb-4 text-3xl font-extrabold">{block.content}</h2>;
      case 'image':
        return <img key={block.id} src={block.content} alt="Content" className="w-full rounded-2xl shadow-lg mb-8" />;
      case 'side-by-side':
        return (
          <div key={block.id} className={`flex flex-col md:flex-row gap-8 items-center mb-10 ${block.style.layoutDirection === 'row-reverse' ? 'md:flex-row-reverse' : ''}`}>
             <div className="w-full md:w-1/2">
                <img src={block.url} alt="" className="w-full rounded-2xl shadow-md object-cover" />
             </div>
             <div className="w-full md:w-1/2 text-slate-700 leading-relaxed text-lg italic md:not-italic">
                {block.content}
             </div>
          </div>
        );
      case 'quote':
        return (
          <blockquote key={block.id} style={commonStyle} className="border-l-8 border-emerald-500 pl-6 py-4 italic my-8 bg-slate-50 text-xl text-slate-600 rounded-r-2xl">
            "{block.content}"
          </blockquote>
        );
      case 'button':
        return (
          <div key={block.id} className="my-10 text-center">
             <a 
                href={block.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block transition-all hover:scale-105 shadow-xl hover:shadow-2xl px-10 py-4 font-black uppercase tracking-wider"
                style={{
                   backgroundColor: block.style.backgroundColor,
                   color: block.style.color,
                   borderRadius: '12px',
                   fontSize: '16px',
                   textDecoration: 'none'
                }}
             >
                {block.content}
             </a>
          </div>
        );
      default:
        return <p key={block.id} style={commonStyle} className="mb-6 leading-relaxed text-slate-700 text-lg whitespace-pre-wrap">{block.content}</p>;
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      {/* HEADER SIMPLIFICADO - PADRONIZADO EM VERDE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex justify-between items-center shrink-0">
         <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('editor')} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'editor' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <PlusCircle size={20} /> {editingId ? 'Editando Notícia' : 'Editor'}
            </button>
            <button 
                onClick={() => setActiveTab('list')} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <List size={20} /> Minhas Publicações
            </button>
         </div>
         
         {activeTab === 'editor' && editingId && (
            <button onClick={handleNewPost} className="text-xs text-emerald-600 font-bold hover:underline px-4">
                Criar Nova Notícia (Limpar)
            </button>
         )}
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col animate-fade-in">
           <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-end">
             <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Suas publicações</h2>
                <p className="text-slate-500 text-sm">Gerenciando conteúdo como: <span className="font-bold text-emerald-600">{currentUser?.name}</span></p>
             </div>
             <button onClick={handleNewPost} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2">
                <Plus size={16} /> Nova Postagem
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             {isLoadingPosts ? (
                <div className="flex flex-col items-center justify-center p-20 gap-3 text-slate-400"><Loader2 className="animate-spin" size={40} /><p className="font-bold">Buscando seus posts...</p></div>
             ) : myPosts.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myPosts.map(post => (
                    <div key={post.id} className="flex gap-5 p-5 border border-slate-100 rounded-3xl hover:shadow-xl hover:border-emerald-100 transition-all bg-white group">
                       <img src={post.thumbnail} alt="" className="w-32 h-32 object-cover rounded-2xl shadow-sm group-hover:scale-105 transition-transform" />
                       <div className="flex-1 flex flex-col justify-between">
                          <div>
                             <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{post.category}</span>
                                {post.isPublic ? (
                                   <span className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1"><Globe size={10}/> Público</span>
                                ) : (
                                   <span className="text-[10px] uppercase font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1"><Lock size={10}/> Interno</span>
                                )}
                             </div>
                             <h3 className="font-bold text-slate-800 mt-2 line-clamp-2 leading-snug">{post.title}</h3>
                             <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-bold"><Calendar size={12}/> {new Date(post.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2 mt-4">
                             <button onClick={() => handleEditPost(post)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Edit size={14} /> Editar</button>
                             <button onClick={() => handleDeletePost(post.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="text-center py-32 text-slate-400">
                 <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6"><List size={40} className="opacity-20" /></div>
                 <p className="text-xl font-bold text-slate-500">Nenhuma postagem encontrada.</p>
                 <button onClick={handleNewPost} className="text-emerald-600 font-bold hover:underline mt-2">Clique para criar sua primeira notícia</button>
               </div>
             )}
           </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden relative animate-fade-in">
          <div className={`flex-1 flex flex-col bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden transition-all duration-500 ${isPreview ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-500"><Settings size={18} /></div>
                <span className="font-black text-slate-800 uppercase tracking-widest text-xs">Configuração do Conteúdo</span>
              </div>
              <div className="flex gap-3">
                <button 
                    onClick={() => setIsPreview(!isPreview)} 
                    className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl transition-all shadow-sm border ${isPreview ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'}`}
                >
                    {isPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                    {isPreview ? 'Voltar para Editor' : 'Visualizar Post'}
                </button>
                
                <button 
                    onClick={handleSavePost} 
                    disabled={isSaving} 
                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} 
                    {editingId ? 'Salvar Alterações' : 'Publicar Notícia'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="space-y-6">
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-4xl font-black text-slate-900 bg-transparent border-none focus:ring-0 placeholder:text-slate-200 transition-all outline-none" placeholder="TÍTULO DA NOTÍCIA..."/>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-inner">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Categoria</label>
                        <div className="relative">
                           <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                           <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pl-10 shadow-sm transition-all outline-none">
                              <option value="Geral">Geral</option><option value="RH">RH</option><option value="TI">TI</option><option value="Segurança">Segurança</option><option value="Eventos">Eventos</option><option value="Financeiro">Financeiro</option><option value="Institucional">Institucional</option>
                           </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Visibilidade</label>
                        <div className="flex bg-white rounded-xl p-1 border border-slate-200">
                           <button onClick={() => setIsPublic(true)} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${isPublic ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                              <Globe size={14}/> Público
                           </button>
                           <button onClick={() => setIsPublic(false)} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${!isPublic ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                              <Lock size={14}/> Interno
                           </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Imagem de Capa (URL)</label>
                        <div className="relative">
                           <ImageIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                           <input type="text" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} className="bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 pl-10 shadow-sm transition-all outline-none" placeholder="URL da Capa..."/>
                        </div>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${isPublic ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                     <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                     <p className="text-[11px] font-medium leading-relaxed">
                        {isPublic 
                           ? 'Este comunicado será exibido no Portal do Visitante (público) e no Dashboard de todos os colaboradores.' 
                           : 'Este comunicado será visível apenas internamente para colaboradores que acessam o sistema com login.'}
                     </p>
                  </div>
              </div>
              
              <div className="space-y-6">
                {blocks.map((block, idx) => renderEditBlock(block, idx))}
              </div>

              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 shadow-inner">
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Inserir novos elements no layout</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => addBlock('paragraph')} className="flex flex-col items-center gap-2 p-4 min-w-[100px] bg-white text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200 hover:border-emerald-100 group shadow-sm"><div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white transition-all"><Type size={20}/></div><span className="text-[10px] font-bold uppercase">Parágrafo</span></button>
                  <button onClick={() => addBlock('header')} className="flex flex-col items-center gap-2 p-4 min-w-[100px] bg-white text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200 hover:border-emerald-100 group shadow-sm"><div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white transition-all"><Type size={20} className="font-bold"/></div><span className="text-[10px] font-bold uppercase">Título</span></button>
                  <button onClick={() => addBlock('image')} className="flex flex-col items-center gap-2 p-4 min-w-[100px] bg-white text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200 hover:border-emerald-100 group shadow-sm"><div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white transition-all"><ImageIcon size={20}/></div><span className="text-[10px] font-bold uppercase">Imagem Full</span></button>
                  <button onClick={() => addBlock('side-by-side')} className="flex flex-col items-center gap-2 p-4 min-w-[100px] bg-white text-emerald-600 rounded-2xl hover:bg-emerald-50 transition-all border border-slate-200 hover:border-emerald-200 group shadow-sm"><div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-white transition-all"><LayoutTemplate size={20}/></div><span className="text-[10px] font-bold uppercase">Lado a Lado</span></button>
                  <button onClick={() => addBlock('quote')} className="flex flex-col items-center gap-2 p-4 min-w-[100px] bg-white text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200 hover:border-emerald-100 group shadow-sm"><div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white transition-all"><Quote size={20}/></div><span className="text-[10px] font-bold uppercase">Citação</span></button>
                  <button onClick={() => addBlock('button')} className="flex flex-col items-center gap-2 p-4 min-w-[100px] bg-white text-emerald-700 rounded-2xl hover:bg-emerald-50 transition-all border border-slate-200 hover:border-emerald-100 group shadow-sm"><div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-white transition-all"><LinkIcon size={20}/></div><span className="text-[10px] font-bold uppercase">Botão Link</span></button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 text-white rounded-b-[2rem]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400"><Wand2 size={18} /></div>
                <span className="text-sm font-black uppercase tracking-widest text-purple-200">Redação Assistida (IA)</span>
              </div>
              <div className="flex gap-3">
                <input type="text" value={geminiPrompt} onChange={(e) => setGeminiPrompt(e.target.value)} placeholder="Ex: Escreva um comunicado sobre o dia do trabalhador..." className="flex-1 bg-white/5 border-none rounded-2xl px-5 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 placeholder:text-slate-600 transition-all outline-none" onKeyDown={(e) => e.key === 'Enter' && handleSmartGenerate()}/>
                <button onClick={handleSmartGenerate} disabled={isGenerating} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all shadow-lg shadow-purple-900/40">{isGenerating ? 'Escrevendo...' : 'Gerar Texto'}</button>
              </div>
            </div>
          </div>

          <div className={`flex-1 bg-white shadow-2xl border border-slate-200 rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-500 ${isPreview ? 'flex fixed inset-0 z-50 m-0 rounded-none lg:static lg:m-0 lg:rounded-[2.5rem] lg:flex' : 'hidden'}`}>
            {isPreview && (
              <div className="lg:hidden p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <span className="font-black uppercase tracking-widest">Visualização Final</span>
                <button onClick={() => setIsPreview(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20} /></button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto bg-white p-6 md:p-12 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                  <div className="h-64 md:h-96 w-full rounded-[2.5rem] overflow-hidden shadow-2xl mb-12 border-8 border-white">
                      <img src={thumbnail} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="px-4">
                    <div className="flex items-center gap-3 mb-6">
                       <span className="bg-emerald-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-100">{category}</span>
                       {isPublic ? (
                          <span className="text-[10px] uppercase font-black text-blue-600 flex items-center gap-1"><Globe size={12}/> Público</span>
                       ) : (
                          <span className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1"><Lock size={12}/> Interno</span>
                       )}
                       <div className="h-px flex-1 bg-slate-100"></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight">{title || <span className="text-slate-100">TÍTULO DA NOTÍCIA</span>}</h1>
                    
                    <div className="flex items-center gap-4 mb-12 pb-8 border-b border-slate-100">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-100 shadow-sm shrink-0">
                           <img src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0d9488&color=fff`} className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Autor da Publicação</p>
                           <p className="text-lg font-bold text-slate-800 leading-none">{currentUser?.name || 'Comunicação Interna'}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                      {blocks.map(renderPreviewBlock)}
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsEditor;
