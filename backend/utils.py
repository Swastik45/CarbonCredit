def calculate_credit(area, ndvi):
    """
    Calculate carbon credit points for a plantation.
    Formula: area (hectares) * NDVI * constant factor (e.g., 100)
    """
    constant_factor = 100.0
    return area * ndvi * constant_factor
