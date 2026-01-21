import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const primaryColor = useThemeColor({}, "primary");
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  const getButtonStyle = () => {
    const baseStyle: ViewStyle = {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 56,
    };

    if (fullWidth) {
      baseStyle.width = "100%";
    }

    if (disabled) {
      return { ...baseStyle, backgroundColor: "#cccccc", opacity: 0.6 };
    }

    switch (variant) {
      case "primary":
        return { ...baseStyle, backgroundColor: primaryColor };
      case "secondary":
        // use theme background as a fallback so the button adapts to dark mode
        return { ...baseStyle, backgroundColor: backgroundColor || "#6c757d" };
      case "outline":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: primaryColor,
        };
      default:
        return baseStyle;
    }
  };

  const getTextColor = () => {
    if (disabled) return "#666666";
    if (variant === "outline") return primaryColor;
    // use themed text color so it adapts to dark mode
    return textColor;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <ThemedText style={[styles.text, { color: getTextColor() }, textStyle]}>
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
