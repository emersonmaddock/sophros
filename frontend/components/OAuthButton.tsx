import { useSSO } from '@clerk/clerk-expo';
import { OAuthStrategy } from '@clerk/types';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};
WebBrowser.maybeCompleteAuthSession();

interface Props {
  // The OAuthStrategy type from Clerk allows you to specify the provider you want to use in this specific instance of the OAuthButton component
  strategy: OAuthStrategy;
  children: React.ReactNode;
}

// Google 'G' logo SVG component
const GoogleIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 18 18">
    <Path
      d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z"
      fill="#4285F4"
    />
    <Path
      d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
      fill="#34A853"
    />
    <Path
      d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
      fill="#FBBC05"
    />
    <Path
      d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
      fill="#EA4335"
    />
  </Svg>
);

export default function OAuthButton({ strategy, children }: Props) {
  useWarmUpBrowser();
  // useSSO hook from Clerk SDK to support various SSO providers
  const { startSSOFlow } = useSSO();

  const onPress = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
      } else {
        throw new Error('Failed to create session');
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  }, [startSSOFlow, strategy]);

  // Check if this is a Google OAuth strategy to show the branded button
  const isGoogle = strategy === 'oauth_google';

  if (isGoogle) {
    return (
      <TouchableOpacity onPress={onPress} style={localStyles.googleButton} activeOpacity={0.9}>
        <View style={localStyles.googleIconContainer}>
          <GoogleIcon />
        </View>
        <Text style={localStyles.googleButtonText}>{children}</Text>
      </TouchableOpacity>
    );
  }

  // Fallback for other OAuth providers
  return (
    <TouchableOpacity onPress={onPress} style={localStyles.fallbackButton} activeOpacity={0.9}>
      <Text style={localStyles.fallbackButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

const localStyles = StyleSheet.create({
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 4,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#3C4043',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'system',
      android: 'Roboto',
      default: 'system',
    }),
  },
  fallbackButton: {
    backgroundColor: '#4285F4',
    borderRadius: 4,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
