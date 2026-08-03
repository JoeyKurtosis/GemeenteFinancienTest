import {
    Label as AriaLabel,
    Slider as AriaSlider,
    SliderThumb as AriaSliderThumb,
    SliderTrack as AriaSliderTrack,
} from "react-aria-components";
import { cx } from "@/utils/cx";

interface RangeSliderProps {
    label?: string;
    minValue: number;
    maxValue: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    formatValue?: (value: number) => string;
    className?: string;
}

export function RangeSlider({
    label,
    minValue,
    maxValue,
    value,
    onChange,
    formatValue = (v) => v.toLocaleString("nl-NL"),
    className,
}: RangeSliderProps) {
    return (
        <AriaSlider
            minValue={minValue}
            maxValue={maxValue}
            value={value}
            onChange={(v) => onChange(v as unknown as [number, number])}
            className={cx("flex flex-col gap-1", className)}
        >
            {label && <AriaLabel className="text-sm font-medium text-secondary">{label}</AriaLabel>}

            <AriaSliderTrack className="group relative h-5 w-full">
                {({ state }) => {
                    const left = state.getThumbPercent(0) * 100;
                    const right = state.getThumbPercent(1) * 100;
                    return (
                        <>
                            {/* Track background — centered vertically in the 20px track area */}
                            <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-quaternary" />
                            {/* Active range fill */}
                            <div
                                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-solid"
                                style={{ left: `${left}%`, width: `${right - left}%` }}
                            />
                            <AriaSliderThumb
                                index={0}
                                className="top-1/2 size-5 rounded-full border-2 border-brand bg-primary shadow-xs outline-none ring-brand-secondary transition duration-100 ease-linear focus-visible:ring-4"
                            />
                            <AriaSliderThumb
                                index={1}
                                className="top-1/2 size-5 rounded-full border-2 border-brand bg-primary shadow-xs outline-none ring-brand-secondary transition duration-100 ease-linear focus-visible:ring-4"
                            />
                        </>
                    );
                }}
            </AriaSliderTrack>

            <div className="flex justify-between text-sm text-tertiary">
                <span>{formatValue(value[0])}</span>
                <span>{formatValue(value[1])}</span>
            </div>
        </AriaSlider>
    );
}
