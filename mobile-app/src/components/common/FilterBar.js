import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

const PLATFORMS = [
    { value: '', label: 'Todas as Lojas' },
    { value: 'shopee', label: '🛍️ Shopee' },
    { value: 'mercadolivre', label: '🏪 Mercado Livre' },
    { value: 'amazon', label: '📦 Amazon' },
    { value: 'aliexpress', label: '🌐 AliExpress' },
    { value: 'kabum', label: '💻 Kabum' },
    { value: 'magazineluiza', label: '🏬 Magazine Luiza' },
    { value: 'terabyteshop', label: '🖥️ Terabyteshop' },
];

export default function FilterBar({
    selectedPlatform,
    onPlatformChange,
    selectedCategory,
    onCategoryChange,
    categories = [],
    onClear
}) {
    const [showPlatformModal, setShowPlatformModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const selectedPlatformLabel = PLATFORMS.find(p => p.value === selectedPlatform)?.label || 'Todas as Lojas';
    const selectedCategoryLabel = categories.find(c => c.id === selectedCategory)?.name || 'Todas';

    const hasFilters = selectedPlatform || selectedCategory;

    return (
        <View style={styles.container}>
            {/* Filtro de Plataforma */}
            <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowPlatformModal(true)}
            >
                <Text style={styles.filterLabel}>Loja:</Text>
                <Text style={styles.filterValue} numberOfLines={1}>
                    {selectedPlatformLabel}
                </Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            {/* Filtro de Categoria */}
            <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowCategoryModal(true)}
            >
                <Text style={styles.filterLabel}>Categoria:</Text>
                <Text style={styles.filterValue} numberOfLines={1}>
                    {selectedCategoryLabel}
                </Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            {/* Botão Limpar */}
            {hasFilters && (
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={onClear}
                >
                    <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
            )}

            {/* Modal de Plataformas */}
            <Modal
                visible={showPlatformModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPlatformModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPlatformModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Selecionar Loja</Text>
                        <ScrollView>
                            {PLATFORMS.map((platform) => (
                                <TouchableOpacity
                                    key={platform.value}
                                    style={[
                                        styles.modalItem,
                                        selectedPlatform === platform.value && styles.modalItemSelected
                                    ]}
                                    onPress={() => {
                                        onPlatformChange(platform.value);
                                        setShowPlatformModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        selectedPlatform === platform.value && styles.modalItemTextSelected
                                    ]}>
                                        {platform.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal de Categorias */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCategoryModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Selecionar Categoria</Text>
                        <ScrollView>
                            <TouchableOpacity
                                style={[
                                    styles.modalItem,
                                    !selectedCategory && styles.modalItemSelected
                                ]}
                                onPress={() => {
                                    onCategoryChange('');
                                    setShowCategoryModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.modalItemText,
                                    !selectedCategory && styles.modalItemTextSelected
                                ]}>
                                    Todas
                                </Text>
                            </TouchableOpacity>
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.modalItem,
                                        selectedCategory === category.id && styles.modalItemSelected
                                    ]}
                                    onPress={() => {
                                        onCategoryChange(category.id);
                                        setShowCategoryModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        selectedCategory === category.id && styles.modalItemTextSelected
                                    ]}>
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        gap: 8,
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    filterLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginRight: 4,
    },
    filterValue: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    arrow: {
        fontSize: 10,
        color: '#9CA3AF',
        marginLeft: 4,
    },
    clearButton: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
    },
    clearText: {
        fontSize: 18,
        color: '#DC2626',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    modalItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalItemSelected: {
        backgroundColor: '#EFF6FF',
    },
    modalItemText: {
        fontSize: 16,
        color: '#1F2937',
    },
    modalItemTextSelected: {
        color: '#2563EB',
        fontWeight: '600',
    },
});
