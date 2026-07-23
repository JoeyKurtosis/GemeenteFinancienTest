export interface Measure {
    key: string;
    name: string;
    expression: string;
    description: string;
    page: string;
}

export interface FieldInfo {
    name: string;
    description: string;
}

export interface MeasuresResponse {
    measures: Measure[];
    fields: FieldInfo[];
}
