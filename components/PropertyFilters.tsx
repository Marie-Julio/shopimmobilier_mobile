import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { FILTER_OPTIONS } from '../constants/filters';
import { Filters } from '../hooks/useProperties.js';

interface PropertyFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onApply: () => void;
  onClear: () => void;
}

const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  visible,
  onClose,
  filters,
  onFilterChange,
  onApply,
  onClear,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtres</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Type de propriété */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type de propriété</Text>
              <View style={styles.options}>
                {FILTER_OPTIONS.types.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      filters.type === option.value && styles.chipActive
                    ]}
                    onPress={() => onFilterChange('type', option.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      filters.type === option.value && styles.chipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Type d'opération */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type d'opération</Text>
              <View style={styles.options}>
                {FILTER_OPTIONS.operations.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      filters.operation === option.value && styles.chipActive
                    ]}
                    onPress={() => onFilterChange('operation', option.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      filters.operation === option.value && styles.chipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prix */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prix (GNF)</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={filters.prix_min}
                  onChangeText={(text) => onFilterChange('prix_min', text)}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={filters.prix_max}
                  onChangeText={(text) => onFilterChange('prix_max', text)}
                />
              </View>
            </View>

            {/* Ville */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ville</Text>
              <View style={styles.options}>
                {FILTER_OPTIONS.villes.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      filters.ville === option.value && styles.chipActive
                    ]}
                    onPress={() => onFilterChange('ville', option.value)}
                  >
                    <Text style={[
                      styles.chipText,
                      filters.ville === option.value && styles.chipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quartier */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quartier</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du quartier"
                value={filters.quartier}
                onChangeText={(text) => onFilterChange('quartier', text)}
              />
            </View>

            {/* Chambres */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chambres minimum</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={filters.chambres_min}
                onChangeText={(text) => onFilterChange('chambres_min', text)}
              />
            </View>

            {/* Équipements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Équipements</Text>
              {[
                { key: 'meuble' as const, label: 'Meublé' },
                { key: 'climatisation' as const, label: 'Climatisation' },
                { key: 'parking' as const, label: 'Parking' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.checkboxItem}
                  onPress={() => onFilterChange(item.key, !filters[item.key])}
                >
                  <View style={[
                    styles.checkbox,
                    filters[item.key] && styles.checkboxChecked
                  ]}>
                    {filters[item.key] && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Filtres avancés */}
            <TouchableOpacity 
              style={styles.advancedButton}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedButtonText}>
                {showAdvanced ? 'Masquer' : 'Afficher'} les filtres avancés
              </Text>
              <Ionicons 
                name={showAdvanced ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#007AFF" 
              />
            </TouchableOpacity>

            {showAdvanced && (
              <>
                {/* État du bien */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>État du bien</Text>
                  <View style={styles.options}>
                    {FILTER_OPTIONS.etats.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.chip,
                          filters.etat === option.value && styles.chipActive
                        ]}
                        onPress={() => onFilterChange('etat', option.value)}
                      >
                        <Text style={[
                          styles.chipText,
                          filters.etat === option.value && styles.chipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Électricité */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Électricité</Text>
                  <View style={styles.options}>
                    {FILTER_OPTIONS.electriciteOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.chip,
                          filters.electricite === option.value && styles.chipActive
                        ]}
                        onPress={() => onFilterChange('electricite', option.value)}
                      >
                        <Text style={[
                          styles.chipText,
                          filters.electricite === option.value && styles.chipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Niveau de bruit */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Niveau de bruit du quartier</Text>
                  <View style={styles.options}>
                    {FILTER_OPTIONS.quartierBruitOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.chip,
                          filters.quartier_bruit === option.value && styles.chipActive
                        ]}
                        onPress={() => onFilterChange('quartier_bruit', option.value)}
                      >
                        <Text style={[
                          styles.chipText,
                          filters.quartier_bruit === option.value && styles.chipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Niveau de sécurité */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Niveau de sécurité</Text>
                  <View style={styles.options}>
                    {FILTER_OPTIONS.niveauSecuriteOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.chip,
                          filters.niveau_securite === option.value && styles.chipActive
                        ]}
                        onPress={() => onFilterChange('niveau_securite', option.value)}
                      >
                        <Text style={[
                          styles.chipText,
                          filters.niveau_securite === option.value && styles.chipTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Services supplémentaires */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Services</Text>
                  {[
                    { key: 'forage' as const, label: 'Forage' },
                    { key: 'groupe_electrogene' as const, label: 'Groupe électrogène' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.checkboxItem}
                      onPress={() => onFilterChange(item.key, !filters[item.key])}
                    >
                      <View style={[
                        styles.checkbox,
                        filters[item.key] && styles.checkboxChecked
                      ]}>
                        {filters[item.key] && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <Text style={styles.checkboxLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={onClear}>
              <Text style={styles.clearButtonText}>Effacer tout</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={() => {
                onApply();
                onClose();
              }}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  body: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#065483',
  },
  chipText: {
    color: '#666',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#f8f8f8',
  },
  halfInput: {
    width: '48%',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#065483',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#065483',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#065483',
    borderRadius: 8,
    gap: 8,
  },
  advancedButtonText: {
    color: '#065483',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#065483',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#065483',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#065483',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PropertyFilters;