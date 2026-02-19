import { useState, useEffect } from 'react';
import {
    Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    Image as ImageIcon, Link, List, Ticket, Monitor,
    GripVertical, Eye, EyeOff, X, Save, Loader2,
    Upload, Trash
} from 'lucide-react';
import api from '../services/api';

const ACTION_TYPES = [
    { value: 'link', label: 'Link externo', icon: Link },
    { value: 'product_list', label: 'Lista de produtos', icon: List },
    { value: 'coupon_list', label: 'Tela de cupons', icon: Ticket },
    { value: 'screen', label: 'Tela do app', icon: Monitor },
];

const DEFAULT_CARD = {
    title: '',
    subtitle: '',
    image_url: '',
    background_color: '#DC2626',
    text_color: '#FFFFFF',
    action_type: 'link',
    action_value: '',
    product_ids: [],
    position: 0,
    is_active: true,
};

export default function AppCards() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [form, setForm] = useState({ ...DEFAULT_CARD });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchCards();
        fetchProducts();
    }, []);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const res = await api.get('/app-cards/admin/all');
            setCards(res.data.data || []);
        } catch (err) {
            console.error('Erro ao buscar cards:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products?limit=100');
            const data = res.data.data || {};
            setProducts(data.products || []);
        } catch (err) {
            console.error('Erro ao buscar produtos:', err);
        }
    };

    const openCreate = () => {
        setEditingCard(null);
        setForm({ ...DEFAULT_CARD, position: cards.length });
        setShowModal(true);
    };

    const openEdit = (card) => {
        setEditingCard(card);
        setForm({
            title: card.title || '',
            subtitle: card.subtitle || '',
            image_url: card.image_url || '',
            background_color: card.background_color || '#DC2626',
            text_color: card.text_color || '#FFFFFF',
            action_type: card.action_type || 'link',
            action_value: card.action_value || '',
            product_ids: card.product_ids || [],
            position: card.position || 0,
            is_active: card.is_active,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return alert('Título é obrigatório');

        try {
            setSaving(true);
            if (editingCard) {
                await api.put(`/app-cards/${editingCard.id}`, form);
            } else {
                await api.post('/app-cards', form);
            }
            setShowModal(false);
            fetchCards();
        } catch (err) {
            console.error('Erro ao salvar card:', err);
            alert('Erro ao salvar card');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/app-cards/${id}`);
            setDeleteConfirm(null);
            fetchCards();
        } catch (err) {
            console.error('Erro ao deletar card:', err);
        }
    };

    const handleToggle = async (id) => {
        try {
            await api.patch(`/app-cards/${id}/toggle`);
            fetchCards();
        } catch (err) {
            console.error('Erro ao alternar status:', err);
        }
    };

    const toggleProductId = (productId) => {
        setForm(prev => {
            const ids = prev.product_ids || [];
            if (ids.includes(productId)) {
                return { ...prev, product_ids: ids.filter(id => id !== productId) };
            }
            return { ...prev, product_ids: [...ids, productId] };
        });
    };

    const handleImageUpload = async (file) => {
        if (!file) return;
        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('image', file);
            const res = await api.post('/app-cards/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = res.data.data?.url;
            if (url) {
                setForm(f => ({ ...f, image_url: url }));
            }
        } catch (err) {
            console.error('Erro ao enviar imagem:', err);
            alert('Erro ao enviar imagem');
        } finally {
            setUploading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase())
    );

    const activeCount = cards.filter(c => c.is_active).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cards do App</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {cards.length} cards • {activeCount} ativos
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Novo Card
                </button>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : cards.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Nenhum card criado</p>
                    <p className="text-gray-400 text-sm mt-1">Crie o primeiro card promocional do app</p>
                </div>
            ) : (
                /* Cards Table */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preview</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Título</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ação</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cards.map((card, idx) => (
                                    <tr key={card.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div
                                                className="w-24 h-14 rounded-lg flex items-center justify-center text-xs font-bold"
                                                style={{
                                                    backgroundColor: card.background_color || '#DC2626',
                                                    color: card.text_color || '#fff',
                                                }}
                                            >
                                                {card.image_url ? (
                                                    <img src={card.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <span className="truncate px-1">{card.title}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                                            {card.subtitle && (
                                                <p className="text-xs text-gray-400 mt-0.5">{card.subtitle}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                {ACTION_TYPES.find(a => a.value === card.action_type)?.label || card.action_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggle(card.id)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${card.is_active
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {card.is_active ? (
                                                    <><Eye className="w-3.5 h-3.5" /> Ativo</>
                                                ) : (
                                                    <><EyeOff className="w-3.5 h-3.5" /> Inativo</>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(card)}
                                                    className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(card.id)}
                                                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Card</h3>
                        <p className="text-sm text-gray-500 mb-6">Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
                    <div className="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingCard ? 'Editar Card' : 'Novo Card'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                            {/* Preview */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                                <div
                                    className="rounded-xl p-5 relative overflow-hidden"
                                    style={{ backgroundColor: form.background_color, color: form.text_color }}
                                >
                                    {form.image_url ? (
                                        <img
                                            src={form.image_url}
                                            alt="Preview"
                                            className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                        />
                                    ) : null}
                                    <div className="relative z-10">
                                        <p className="text-xs font-bold tracking-wider opacity-90">
                                            {form.title || 'TÍTULO DO CARD'}
                                        </p>
                                        <p className="text-2xl font-black mt-1">
                                            {form.subtitle || 'Subtítulo do card'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Title & Subtitle */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                        placeholder="Ex: OFERTAS DO DIA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                                    <input
                                        type="text"
                                        value={form.subtitle}
                                        onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                        placeholder="Ex: Até 70% OFF"
                                    />
                                </div>
                            </div>

                            {/* Image Upload + URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Card</label>

                                {/* Current image preview */}
                                {form.image_url && (
                                    <div className="relative mb-3 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={form.image_url} alt="Card" className="w-full h-32 object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                                            title="Remover imagem"
                                        >
                                            <Trash className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Upload area */}
                                {!form.image_url && (
                                    <label
                                        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors mb-3 ${uploading
                                                ? 'border-red-300 bg-red-50'
                                                : 'border-gray-300 hover:border-red-400 hover:bg-red-50/50'
                                            }`}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleImageUpload(file);
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageUpload(file);
                                            }}
                                        />
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                                <span className="text-sm text-red-600 font-medium">Enviando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-6 h-6 text-gray-400" />
                                                <span className="text-sm text-gray-500">Arraste uma imagem ou <span className="text-red-600 font-medium">clique para escolher</span></span>
                                                <span className="text-xs text-gray-400">JPEG, PNG, WebP ou GIF (máx. 5MB)</span>
                                            </>
                                        )}
                                    </label>
                                )}

                                {/* URL fallback */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 whitespace-nowrap">ou cole URL:</span>
                                    <input
                                        type="url"
                                        value={form.image_url}
                                        onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Colors */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor de fundo</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={form.background_color}
                                            onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))}
                                            className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={form.background_color}
                                            onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))}
                                            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor do texto</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={form.text_color}
                                            onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))}
                                            className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={form.text_color}
                                            onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))}
                                            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Ação</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {ACTION_TYPES.map(at => (
                                        <button
                                            key={at.value}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, action_type: at.value }))}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-xs font-medium ${form.action_type === at.value
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                                }`}
                                        >
                                            <at.icon className="w-5 h-5" />
                                            {at.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Value */}
                            {(form.action_type === 'link' || form.action_type === 'screen') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {form.action_type === 'link' ? 'URL de redirecionamento' : 'Nome da tela'}
                                    </label>
                                    <input
                                        type="text"
                                        value={form.action_value}
                                        onChange={e => setForm(f => ({ ...f, action_value: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                        placeholder={form.action_type === 'link' ? 'https://...' : 'Coupons, Home, Favorites...'}
                                    />
                                </div>
                            )}

                            {/* Product Linking (for product_list) */}
                            {form.action_type === 'product_list' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vincular Produtos ({(form.product_ids || []).length} selecionados)
                                    </label>
                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm mb-2"
                                        placeholder="Buscar produto..."
                                    />
                                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                                        {filteredProducts.slice(0, 30).map(p => (
                                            <label
                                                key={p.id}
                                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${(form.product_ids || []).includes(p.id) ? 'bg-red-50' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={(form.product_ids || []).includes(p.id)}
                                                    onChange={() => toggleProductId(p.id)}
                                                    className="w-4 h-4 text-red-600 rounded border-gray-300"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-900 truncate">{p.name}</p>
                                                    <p className="text-xs text-gray-400">R$ {p.current_price?.toFixed(2)}</p>
                                                </div>
                                            </label>
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center py-4">Nenhum produto encontrado</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Position */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Posição</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.position}
                                        onChange={e => setForm(f => ({ ...f, position: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.is_active}
                                            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                            className="w-4 h-4 text-red-600 rounded border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Card ativo</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {editingCard ? 'Salvar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
