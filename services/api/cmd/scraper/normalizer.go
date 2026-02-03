package main

// normalize converte ListingDetails para SourceListing
func normalize(details []ListingDetails) []SourceListing {
	var listings []SourceListing

	for _, d := range details {
		listing := SourceListing{
			Source:          "ZAP",
			SourceListingID: d.SourceListingID,
			CanonicalURL:    d.URL,
			Title:           d.Title,
			Description:     d.Description,
			PriceCents:      d.PriceCents,
			AreaM2:          d.AreaM2,
			Bedrooms:        d.Bedrooms,
			Bathrooms:       d.Bathrooms,
			ParkingSpots:    d.ParkingSpots,
			CondoFeeCents:   d.CondoFeeCents,
			IPTUCents:       d.IPTUCents,
			Address:         d.Address,
			Neighborhood:    d.Neighborhood,
			City:            d.City,
			State:           d.State,
			Images:          d.Images,
			PublishedAt:     d.PublishedAt,
		}

		// Validação básica - precisa ter preço e área
		if listing.PriceCents > 0 && listing.AreaM2 > 0 {
			listings = append(listings, listing)
		}
	}

	return listings
}
