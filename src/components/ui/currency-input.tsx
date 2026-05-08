import * as React from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value?: string | number;
  onChange?: (value: string) => void;
  placeholder?: string;
}

function formatToCurrency(raw: string): string {
  // Remove tudo que não for dígito
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Converte para centavos
  const cents = parseInt(digits, 10);
  // Divide por 100 para obter reais
  const value = cents / 100;

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function unmaskCurrency(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const value = cents / 100;
  return value.toFixed(2);
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");

    // Sincroniza display com prop value
    React.useEffect(() => {
      if (value === undefined || value === "") {
        setDisplayValue("");
        return;
      }
      const num = typeof value === "string" ? parseFloat(value) || 0 : value;
      const formatted = new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
      setDisplayValue(formatted);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Permite apenas dígitos, vírgula e ponto (para digitação natural)
      const filtered = raw.replace(/[^\d.,]/g, "");
      const digitsOnly = filtered.replace(/\D/g, "");

      const formatted = formatToCurrency(digitsOnly);
      setDisplayValue(formatted);

      const numeric = unmaskCurrency(formatted);
      onChange?.(numeric);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite: dígitos, backspace, delete, tab, arrows, ponto, vírgula
      const allowed = [
        "Backspace",
        "Delete",
        "Tab",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        ",",
        ".",
      ];
      if (allowed.includes(e.key)) return;
      if (/\d/.test(e.key)) return;
      // Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "0,00"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
