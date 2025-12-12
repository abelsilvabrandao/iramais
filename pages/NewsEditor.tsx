
import React, { useState, useEffect } from 'react';
import { BlockType, ContentBlock, StyleConfig, NewsArticle } from '../types';
import { Plus, Trash2, Image as ImageIcon, Type, Quote, Settings, Wand2, Eye, EyeOff, Save, Tag, Link as LinkIcon, ExternalLink, Loader2, List, PlusCircle, Edit, Calendar, X } from 'lucide-react';
import { generateNewsContent } from '../services/geminiService';
import { addNews, fetchNews, updateNews, deleteNews } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NewsEditor: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');
  const [myPosts, setMyPosts] = useState<NewsArticle[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Editor State
  const [editingId, setEditingId] = useState<string | null>(null); // ID se estiver editando
  const [title, setTitle] = useState(''); // Starts empty to show placeholder
  const [category, setCategory] = useState('Geral');
  const [thumbnail, setThumbnail] = useState('https://picsum.photos/800/400');
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: '1', type: 'header', content: 'Subtítulo da Seção', style: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937' } },
    { id: '2', type: 'paragraph', content: 'Comece a editar este bloco clicando aqui...', style: { fontSize: '16px', color: '#4b5563', textAlign: 'left' } }
  ]);
  const [isPreview, setIsPreview] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user posts
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
      // Filtrar apenas posts onde o autor é o usuário atual
      const mine = allNews.filter(n => n.author === currentUser.name);
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
    setThumbnail(post.thumbnail);
    setBlocks(post.blocks);
    setActiveTab('editor');
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta publicação?")) {
      try {
        await deleteNews(id);
        loadMyPosts(); // Refresh list
      } catch (error) {
        alert("Erro ao excluir postagem.");
      }
    }
  };

  const handleNewPost = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Geral');
    setThumbnail('https://picsum.photos/800/400');
    setBlocks([
      { id: '1', type: 'header', content: 'Subtítulo da Seção', style: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937' } },
      { id: '2', type: 'paragraph', content: 'Comece a editar este bloco clicando aqui...', style: { fontSize: '16px', color: '#4b5563', textAlign: 'left' } }
    ]);
    setActiveTab('editor');
  };

  const addBlock = (type: BlockType) => {
    let newContent = 'Novo bloco...';
    let newStyle: StyleConfig = { fontSize: '16px', color: '#333' };
    let newUrl = undefined;

    if (type === 'image') {
      newContent = 'https://picsum.photos/800/400';
    } else if (type === 'header') {
      newContent = 'Novo Título';
      newStyle = { fontSize: '20px', fontWeight: 'bold', color: '#111827' };
    } else if (type === 'button') {
      newContent = 'Clique Aqui';
      newUrl = 'https://google.com';
      newStyle = { 
        backgroundColor: '#059669', // Emerald 600
        color: '#ffffff', 
        fontSize: '14px', 
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '12px 24px',
        borderRadius: '8px'
      };
    }

    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: newContent,
      url: newUrl,
      style: newStyle
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
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
    
    setIsSaving(true);
    try {
      // Sanitize blocks: Convert undefined 'url' to null because Firestore doesn't accept undefined
      const sanitizedBlocks = blocks.map(b => ({
        ...b,
        url: b.url || null, // FIX: Ensure no undefined values
        style: { ...b.style }
      }));

      const postData = {
        title,
        category,
        thumbnail,
        blocks: sanitizedBlocks,
        date: new Date().toISOString(),
        published: true,
        author: currentUser?.name || 'Comunicação Interna',
        externalUrl: null // Ensure this field exists or is null
      };

      if (editingId) {
        await updateNews(editingId, postData);
        alert('Postagem atualizada com sucesso!');
      } else {
        await addNews(postData);
        alert('Postagem publicada com sucesso!');
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Erro ao salvar post:", error);
      alert(`Erro ao salvar postagem: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Render component for a single block in Edit Mode
  const renderEditBlock = (block: ContentBlock) => {
    return (
      <div key={block.id} className="relative group border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-4 bg-white transition-all">
        {/* Block Controls */}
        <div className="absolute -top-3 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-md rounded-full px-2 py-1 border border-slate-200 z-10">
          <button onClick={() => removeBlock(block.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Remover"><Trash2 size={14}/></button>
          <div className="w-px bg-slate-200 mx-1"></div>
          {/* Simple Style Controls */}
          {block.type !== 'image' && block.type !== 'button' && (
             <>
               <button onClick={() => updateBlockStyle(block.id, { textAlign: 'left' })} className="p-1 text-slate-500 hover:bg-slate-100 rounded text-xs">Eq</button>
               <button onClick={() => updateBlockStyle(block.id, { textAlign: 'center' })} className="p-1 text-slate-500 hover:bg-slate-100 rounded text-xs">Cen</button>
               <input 
                  type="color" 
                  value={block.style.color || '#000000'} 
                  onChange={(e) => updateBlockStyle(block.id, { color: e.target.value })}
                  className="w-6 h-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                  title="Cor do Texto"
               />
             </>
          )}
          {block.type === 'button' && (
            <>
               <input 
                  type="color" 
                  value={block.style.backgroundColor || '#059669'} 
                  onChange={(e) => updateBlockStyle(block.id, { backgroundColor: e.target.value })}
                  className="w-6 h-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                  title="Cor do Fundo"
               />
               <input 
                  type="color" 
                  value={block.style.color || '#ffffff'} 
                  onChange={(e) => updateBlockStyle(block.id, { color: e.target.value })}
                  className="w-6 h-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                  title="Cor do Texto"
               />
            </>
          )}
        </div>

        {/* Content Input */}
        {block.type === 'image' ? (
           <div className="space-y-2">
             <div className="bg-slate-100 h-48 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={block.content} alt="Preview" className="h-full object-cover" />
             </div>
             <input 
               type="text" 
               value={block.content}
               onChange={(e) => updateBlockContent(block.id, e.target.value)}
               className="w-full text-xs p-2 border border-slate-200 rounded"
               placeholder="URL da Imagem..."
             />
           </div>
        ) : block.type === 'button' ? (
           <div className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                   <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Texto do Botão</label>
                   <input 
                      type="text"
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Ex: Acessar Link"
                   />
                </div>
                <div className="flex-1">
                   <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Link de Destino (URL)</label>
                   <div className="relative">
                     <ExternalLink className="absolute right-2 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                     <input 
                        type="text"
                        value={block.url || ''}
                        onChange={(e) => updateBlockUrl(block.id, e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 text-sm pr-8"
                        placeholder="Ex: https://..."
                     />
                   </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded flex justify-center">
                 <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()}
                    className="inline-block transition-transform hover:scale-105"
                    style={{
                       backgroundColor: block.style.backgroundColor,
                       color: block.style.color,
                       padding: block.style.padding,
                       borderRadius: block.style.borderRadius,
                       fontSize: block.style.fontSize,
                       fontWeight: block.style.fontWeight,
                       textDecoration: 'none'
                    }}
                 >
                    {block.content || 'Botão'}
                 </a>
              </div>
           </div>
        ) : (
          <textarea
            value={block.content}
            onChange={(e) => updateBlockContent(block.id, e.target.value)}
            style={{ ...block.style }}
            className="w-full bg-transparent resize-y focus:outline-none focus:bg-slate-50 p-2 rounded min-h-[80px]"
          />
        )}
        <div className="absolute top-2 left-2 text-[10px] uppercase text-slate-300 font-bold tracking-widest pointer-events-none select-none flex items-center gap-1">
          {block.type === 'button' && <LinkIcon size={10} />}
          {block.type}
        </div>
      </div>
    );
  };

  // Render component for a single block in Preview Mode
  const renderPreviewBlock = (block: ContentBlock) => {
    const commonStyle = { ...block.style };
    
    switch (block.type) {
      case 'header':
        return <h2 key={block.id} style={commonStyle} className="mb-4">{block.content}</h2>;
      case 'image':
        return <img key={block.id} src={block.content} alt="Content" className="w-full rounded-xl shadow-md mb-6" />;
      case 'quote':
        return (
          <blockquote key={block.id} style={commonStyle} className="border-l-4 border-indigo-500 pl-4 py-2 italic my-6 bg-slate-50">
            {block.content}
          </blockquote>
        );
      case 'button':
        return (
          <div key={block.id} className="my-6 text-center">
             <a 
                href={block.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                style={{
                   backgroundColor: block.style.backgroundColor,
                   color: block.style.color,
                   padding: block.style.padding,
                   borderRadius: block.style.borderRadius,
                   fontSize: block.style.fontSize,
                   fontWeight: block.style.fontWeight,
                   textDecoration: 'none'
                }}
             >
                {block.content}
             </a>
          </div>
        );
      default:
        return <p key={block.id} style={commonStyle} className="mb-4 leading-relaxed whitespace-pre-wrap">{block.content}</p>;
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex justify-between items-center shrink-0">
         <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'editor' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <PlusCircle size={18} /> {editingId ? 'Editando Postagem' : 'Nova Postagem'}
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <List size={18} /> Minhas Publicações
            </button>
         </div>
         {activeTab === 'list' && (
           <button onClick={handleNewPost} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
             <Plus size={16} /> Criar Nova
           </button>
         )}
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
           <div className="p-6 border-b border-slate-100">
             <h2 className="text-xl font-bold text-slate-800">Suas últimas publicações</h2>
             <p className="text-slate-500 text-sm">Gerencie o conteúdo postado por você ({currentUser?.name})</p>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6">
             {isLoadingPosts ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
             ) : myPosts.length > 0 ? (
               <div className="grid grid-cols-1 gap-4">
                  {myPosts.map(post => (
                    <div key={post.id} className="flex flex-col md:flex-row items-center gap-4 p-4 border border-slate-100 rounded-xl hover:shadow-md transition-all bg-slate-50">
                       <img src={post.thumbnail} alt="" className="w-full md:w-32 h-24 object-cover rounded-lg" />
                       <div className="flex-1 text-center md:text-left">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{post.category}</span>
                          <h3 className="font-bold text-slate-800 mt-1">{post.title}</h3>
                          <p className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-1 mt-1">
                            <Calendar size={12}/> {new Date(post.date).toLocaleDateString()}
                          </p>
                       </div>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditPost(post)}
                            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                          >
                            <Edit size={16} /> Editar
                          </button>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <Trash2 size={16} /> Excluir
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="text-center py-20 text-slate-400">
                 <List size={48} className="mx-auto mb-4 opacity-20" />
                 <p>Você ainda não criou nenhuma publicação.</p>
                 <button onClick={handleNewPost} className="text-indigo-600 font-medium hover:underline mt-2">Criar a primeira agora</button>
               </div>
             )}
           </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden relative">
          {/* Editor Panel (Left) */}
          <div className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ${isPreview ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-slate-500" />
                <span className="font-semibold text-slate-700">Editor de Blocos {editingId && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded ml-2">Editando</span>}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsPreview(!isPreview)} 
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isPreview ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                >
                  {isPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                  {isPreview ? 'Fechar Preview' : 'Visualizar'}
                </button>
                <button 
                    onClick={handleSavePost} 
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} 
                  {editingId ? 'Salvar Alterações' : 'Publicar'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-3xl font-bold text-slate-900 bg-transparent border-none focus:ring-0 placeholder:text-slate-300 focus:placeholder-transparent"
                    placeholder="Título da Nova Postagem"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category Selector */}
                    <div className="flex items-center gap-2">
                        <Tag size={16} className="text-slate-400" />
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 w-full"
                        >
                          <option value="Geral">Geral</option>
                          <option value="RH">RH</option>
                          <option value="TI">TI</option>
                          <option value="Segurança">Segurança</option>
                          <option value="Eventos">Eventos</option>
                          <option value="Financeiro">Financeiro</option>
                          <option value="Institucional">Institucional</option>
                        </select>
                    </div>

                    {/* Thumbnail Input */}
                    <div className="flex items-center gap-2">
                        <ImageIcon size={16} className="text-slate-400" />
                        <input 
                          type="text"
                          value={thumbnail}
                          onChange={(e) => setThumbnail(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 w-full"
                          placeholder="URL da Imagem de Capa"
                        />
                    </div>
                  </div>
              </div>
              
              <div className="space-y-4">
                {blocks.map(renderEditBlock)}
              </div>

              {/* Add Block Controls */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                <button onClick={() => addBlock('paragraph')} className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><Type size={14}/> Texto</button>
                <button onClick={() => addBlock('header')} className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><Type size={14} className="font-bold"/> Título</button>
                <button onClick={() => addBlock('image')} className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><ImageIcon size={14}/> Imagem</button>
                <button onClick={() => addBlock('quote')} className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><Quote size={14}/> Citação</button>
                <button onClick={() => addBlock('button')} className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100"><LinkIcon size={14}/> Botão Link</button>
              </div>
            </div>

            {/* AI Assist Bar */}
            <div className="p-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 size={16} className="text-purple-400" />
                <span className="text-sm font-medium">Assistente IA Gemini</span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={geminiPrompt}
                  onChange={(e) => setGeminiPrompt(e.target.value)}
                  placeholder="Ex: Escreva sobre a meta de vendas..."
                  className="flex-1 bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500 placeholder:text-slate-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSmartGenerate()}
                />
                <button 
                  onClick={handleSmartGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isGenerating ? 'Gerando...' : 'Gerar'}
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Panel (Right) - or Fullscreen overlay on mobile if preview active */}
          <div className={`flex-1 bg-white shadow-xl border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${isPreview ? 'flex fixed inset-0 z-50 m-0 rounded-none lg:static lg:m-0 lg:rounded-2xl lg:flex' : 'hidden'}`}>
            {isPreview && (
              <div className="lg:hidden p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <span className="font-bold">Pré-visualização</span>
                <button onClick={() => setIsPreview(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X size={18} /></button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                <div className="max-w-2xl mx-auto bg-white p-0 shadow-sm min-h-full rounded-xl overflow-hidden">
                  {/* Cover Image in Preview */}
                  <div className="h-64 w-full bg-slate-200">
                      <img src={thumbnail} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="p-12">
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded mb-4 inline-block">{category}</span>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{title || <span className="text-slate-300 italic">Sem Título</span>}</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-100">
                        <span className="font-semibold text-indigo-600">Por {currentUser?.name || 'Comunicação Interna'}</span>
                        <span>•</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="article-content">
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
