import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

export type RootTabParamList = {
  Home: undefined
  Create: undefined
  Settings: undefined
}

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList>
  Session: { id: string }
  Profile: undefined
  ProfileEdit: undefined
}

export type AppTabScreenProps<T extends keyof RootTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>
