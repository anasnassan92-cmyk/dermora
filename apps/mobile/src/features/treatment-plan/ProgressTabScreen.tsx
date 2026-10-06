/** "Framsteg" tab – Release 2 placeholder (progress tracking). Owner: Even. */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Blob, IconBadge, InfoPanel, Screen, T } from '../../components/ui';
import { spacing } from '../../theme';

export function ProgressTabScreen() {
  return (
    <Screen>
      <Blob />
      <View style={styles.hero}>
        <IconBadge name="chart-bars" size={110} />
        <T variant="display" center style={styles.title}>Framsteg</T>
        <T variant="body" muted center>Kommer i Release 2: följ din hud över tid med progressbilder, jämför före och efter och se hur din rutin fungerar.</T>
      </View>
      <InfoPanel title="Tills dess" text="Följ din plan i 4–8 veckor och ta en ny bild via Skanna när det är dags för uppföljning." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: spacing.xxl },
  title: { marginTop: spacing.xl, marginBottom: spacing.sm },
});
