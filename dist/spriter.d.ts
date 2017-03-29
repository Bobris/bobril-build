export interface SpritePlace {
    width: number;
    height: number;
    x: number;
    y: number;
}
export declare function spritePlace<T extends SpritePlace>(sprites: T[]): [number, number];
