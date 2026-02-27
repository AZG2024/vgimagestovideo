export declare enum ProductCategory {
    BRACELET = "bracelet",
    NECKLACE = "necklace",
    HOME_STONES = "home_stones"
}
export declare class CreateJobDto {
    userId?: string;
    productCategory: ProductCategory;
    stoneName?: string;
}
