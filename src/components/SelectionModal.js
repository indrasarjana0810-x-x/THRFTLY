import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomText from './CustomText';
import CustomInput from './CustomInput';
import Colors from '../constants/colors';
import { useLanguage } from '../localization/LanguageContext';

export default function SelectionModal({
  visible,
  onClose,
  title,
  options = [], // { id, label }
  onSelect,
  searchable = false,
  searchPlaceholder = "Cari...",
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <CustomText type="h2" style={[styles.modalTitle, { color: theme.text.heading }]}>
            {title}
          </CustomText>

          {searchable && (
            <CustomInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              iconName="search"
              containerStyle={{ marginBottom: 12 }}
            />
          )}

          <ScrollView style={styles.modalScroll}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.7}
                  style={[styles.modalOption, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setSearchQuery('');
                    onSelect(option);
                  }}
                >
                  <CustomText type="body" style={{ color: theme.text.primary }}>
                    {option.label}
                  </CustomText>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <CustomText type="body" style={{ color: theme.text.secondary }}>
                  Tidak ada hasil
                </CustomText>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setSearchQuery('');
              onClose();
            }}
            style={styles.cancelBtn}
          >
            <CustomText type="body-bold" style={styles.cancelBtnText}>
              {t('common.cancel') !== 'common.cancel' && t('common.cancel') ? t('common.cancel') : 'Batal'}
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1.5,
    width: "100%",
    maxHeight: "80%",
    padding: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  modalScroll: {
    marginBottom: 16,
    maxHeight: 280,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.semantic.error.main,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#FFFFFF",
  },
});
