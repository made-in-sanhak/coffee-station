import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../utils/theme';

export default function NotificationScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>알림</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.emptyContainer}>
        <View style={styles.iconCircle}>
          <Bell size={34} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>알림이 없습니다</Text>
        <Text style={styles.emptyDescription}>
          새로운 소식이 있으면 이곳에서 알려드릴게요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
  },
});