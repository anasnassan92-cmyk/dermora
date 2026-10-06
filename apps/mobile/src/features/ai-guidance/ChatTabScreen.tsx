/**
 * "Chat" tab: opens the conversation for the latest analyzed assessment, or
 * explains how to get one. Owner: Youssef.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, IconBadge, Screen, T } from '../../components/ui';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { assessmentService } from '../assessment/services/assessmentService';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Chat'>, NativeStackScreenProps<AppStackParamList>>;

export function ChatTabScreen({ navigation }: Props) {
  const [assessmentId, setAssessmentId] = useState<string | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      assessmentService
        .list()
        .then((l) => setAssessmentId(l.find((a) => a.status === 'analyzed')?.id ?? null))
        .catch(() => setAssessmentId(null));
    }, []),
  );

  if (assessmentId === undefined) return <Screen><T muted>Laddar …</T></Screen>;

  return (
    <Screen>
      <View style={styles.hero}>
        <IconBadge name="chat" size={96} />
        <T variant="h1" center style={styles.title}>Dermora AI</T>
        <T variant="small" muted center>
          {assessmentId
            ? 'Fortsätt konversationen om din bedömning och din plan.'
            : 'Chatten känner till dina svar, bilder och din plan. Gör först en bedömning så kan du ställa frågor om just din hud.'}
        </T>
      </View>
      {assessmentId ? (
        <Button title="Öppna chatten" onPress={() => navigation.navigate('AIChat', { assessmentId })} />
      ) : (
        <Button title="Starta bedömning" onPress={() => navigation.navigate('Home')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ hero: { alignItems: 'center', marginVertical: spacing.xxl }, title: { marginTop: spacing.xl, marginBottom: spacing.sm } });
