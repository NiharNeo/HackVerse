# Requirements Document

## Introduction

The Travel Planner & Booking feature extends the existing Voyage Elite platform into a full-service travel planning and booking website. Users provide a destination, travel dates, and the number of people, and the system generates **2–3 distinct itinerary variants** covering hotels, restaurants, and activities for the entire trip duration. Users compare the variants side-by-side and select their preferred option. The feature also provides a traditional travel and tourism booking experience — allowing users to browse, select, and confirm reservations for hotels, activities, and dining.

The feature builds on the existing React + Vite frontend, Node.js/Express backend, and local CSV/JSON datasets already in the codebase. Live data is augmented by four free/freemium third-party APIs (OpenTripMap, RestCountries, OpenWeatherMap, and Unsplash) where available, with local datasets serving as the fallback. No user authentication is required — bookings are tracked via anonymous session storage. The feature is styled within the existing Voyage Elite design system (Deep Navy, Vibrant Aqua, Tropical Teal palette; Plus Jakarta Sans / Inter typography).

---

## Glossary

- **Itinerary_Generator**: The subsystem that produces a set of itinerary variants from user inputs, using a combination of local datasets and live API data.
- **Itinerary_Variant**: A single complete day-by-day travel plan. The Itinerary_Generator produces 2–3 Itinerary_Variants per request, differentiated by style (e.g., Budget, Balanced, Premium) or theme (e.g., Adventure, Cultural, Relaxed).
- **Variant_Selector**: The UI component that presents 2–3 Itinerary_Variants side-by-side for comparison and lets the user choose one to proceed with.
- **Trip_Planner_Form**: The UI component where the user enters destination, dates, and guest count.
- **Itinerary_View**: The UI page that renders the selected Itinerary_Variant organised by day.
- **Booking_Engine**: The subsystem that handles reservation requests, confirmation, and booking state management using session storage.
- **Session_Store**: The browser sessionStorage object used to persist booking records for the duration of the browser session without requiring user authentication.
- **Booking_Manager**: The UI page where a Traveller views and manages their session bookings.
- **Hotel_Card**: A UI component that presents a single hotel option with image, price, rating, and availability.
- **Restaurant_Card**: A UI component that presents a dining option with cuisine type, rating, and booking link.
- **Activity_Card**: A UI component that presents a sightseeing or experience option with description, duration, and price.
- **Day_Plan**: A single day's schedule within an Itinerary_Variant, containing morning, afternoon, and evening slots.
- **Guest**: Any visitor to the website — no authentication required.
- **Traveller**: A Guest who has initiated or completed a booking in the current session.
- **Search_Engine**: The backend module that queries local datasets (Tourist_Destinations.csv, hotels.csv, destinations.json) and enriches results with live API data.
- **API_Server**: The existing Express server running on port 5001.
- **Date_Range**: The combination of a check-in date and a check-out date that defines the trip duration in whole days.
- **Data_Layer**: The backend abstraction that merges local dataset results with live API responses, returning a unified data structure to the Itinerary_Generator.
- **OpenTripMap_Client**: The backend module that calls the [OpenTripMap Places API](https://opentripmap.io/) (available via RapidAPI free tier) to fetch tourist attractions and points of interest near a destination.
- **RestCountries_Client**: The backend module that calls the [RestCountries v3 API](https://restcountries.com/) (free, no key required) to fetch country-level destination metadata such as currency, language, capital, and timezone.
- **Weather_Client**: The backend module that calls the [OpenWeatherMap Current & Forecast API](https://openweathermap.org/api) (free tier: 1,000 calls/day) to fetch a 5-day weather forecast for the destination.
- **Photo_Client**: The backend module that calls the [Unsplash API](https://unsplash.com/developers) (free demo tier: 50 requests/hour) to fetch high-quality destination and activity photos.

---

## Requirements

### Requirement 1: Trip Planning Form

**User Story:** As a Guest, I want to enter my destination, travel dates, and number of people in a single form, so that I can quickly initiate the creation of my travel plan.

#### Acceptance Criteria

1. THE Trip_Planner_Form SHALL display three input fields: destination (text/autocomplete), Date_Range (date picker), and guest count (numeric stepper).
2. WHEN the Guest submits the Trip_Planner_Form with all three fields populated, THE Itinerary_Generator SHALL begin generating the itinerary variants.
3. IF the Guest submits the Trip_Planner_Form with one or more fields empty, THEN THE Trip_Planner_Form SHALL display an inline validation error identifying each missing field and SHALL NOT submit the request.
4. IF the Guest enters a check-out date that is earlier than or equal to the check-in date, THEN THE Trip_Planner_Form SHALL display a date validation error and SHALL NOT submit the request.
5. IF the Guest enters a guest count less than 1 or greater than 20, THEN THE Trip_Planner_Form SHALL display a guest count validation error and SHALL NOT submit the request.
6. WHEN the Guest types in the destination field, THE Trip_Planner_Form SHALL display autocomplete suggestions derived from the local destinations.json and Tourist_Destinations.csv datasets within 300ms of the last keystroke.
7. THE Trip_Planner_Form SHALL be accessible from the homepage hero section and the existing "Plan My Trip" navigation button.

---

### Requirement 2: Live API Data Enrichment

**User Story:** As a Guest, I want the itinerary to include rich, up-to-date information about my destination, so that the recommendations feel current and relevant rather than purely static.

#### Acceptance Criteria

1. WHEN the Itinerary_Generator begins generating for a destination, THE Data_Layer SHALL query OpenTripMap_Client for points of interest within a 10 km radius of the destination's coordinates.
2. WHEN the Itinerary_Generator begins generating for a destination, THE Data_Layer SHALL query RestCountries_Client for the destination country's currency, language, capital, and timezone.
3. WHEN the Itinerary_Generator begins generating for a destination, THE Weather_Client SHALL fetch a 5-day weather forecast for the destination and THE Itinerary_View SHALL display the forecast summary for each Day_Plan that falls within the 5-day window.
4. WHEN the Itinerary_View renders a Hotel_Card or Activity_Card without a local dataset image, THE Photo_Client SHALL supply a destination-relevant photograph from Unsplash, attributed per the Unsplash API guidelines.
5. IF the OpenTripMap_Client call fails or returns no results, THEN THE Data_Layer SHALL fall back to activities sourced from the local Tourist_Destinations.csv dataset and SHALL NOT surface the API error to the Guest.
6. IF the RestCountries_Client call fails, THEN THE Data_Layer SHALL omit destination metadata from the response and SHALL NOT surface the API error to the Guest.
7. IF the Weather_Client call fails, THEN THE Itinerary_View SHALL omit the weather forecast section for that Day_Plan and SHALL NOT surface the API error to the Guest.
8. IF the Photo_Client call fails or returns no results, THEN THE Itinerary_View SHALL display the placeholder image from the local dataset or a design-system default image, and SHALL NOT surface the API error to the Guest.
9. THE Data_Layer SHALL complete all external API calls within 5 seconds and SHALL return partial results if one or more calls exceed this timeout.
10. THE API_Server SHALL store API keys for OpenTripMap and OpenWeatherMap in environment variables and SHALL NOT expose them to the client.

---

### Requirement 3: Itinerary Variant Generation

**User Story:** As a Guest, I want the system to generate 2–3 distinct itinerary options for my trip, so that I can choose the plan that best fits my travel style and budget.

#### Acceptance Criteria

1. WHEN a valid Trip_Planner_Form is submitted, THE Itinerary_Generator SHALL produce exactly 2 or 3 Itinerary_Variants for the requested destination and Date_Range.
2. EACH Itinerary_Variant SHALL have a distinct style label, such as "Budget", "Balanced", or "Premium", or a theme label such as "Adventure", "Cultural", or "Relaxed".
3. EACH Itinerary_Variant SHALL contain one Day_Plan for each calendar day within the Date_Range.
4. EACH Day_Plan SHALL include at least one hotel recommendation, at least one restaurant recommendation, and at least one activity recommendation.
5. Hotel and activity recommendations SHALL be sourced first from the Data_Layer (merged local + live API data), with priority given to live OpenTripMap data when available.
6. WHEN the Itinerary_Generator is running, THE Variant_Selector SHALL display a loading indicator within 200ms of the request being sent.
7. WHEN all variants are ready, THE Itinerary_Generator SHALL deliver all Itinerary_Variants to the frontend within 10 seconds for trips of up to 14 days.
8. IF no results are found for the requested destination in either the local datasets or the live APIs, THEN THE Itinerary_Generator SHALL return a descriptive error message and THE Variant_Selector SHALL display it clearly to the Guest.
9. THE Itinerary_Generator SHALL accept guest count and SHALL use it in cost summaries displayed within each Itinerary_Variant.

---

### Requirement 4: Itinerary Variant Comparison & Selection

**User Story:** As a Guest, I want to compare the generated itinerary options side-by-side before committing, so that I can pick the plan that best matches my preferences.

#### Acceptance Criteria

1. WHEN variants are ready, THE Variant_Selector SHALL display all 2–3 Itinerary_Variants simultaneously in a card-based comparison layout.
2. EACH variant card in the Variant_Selector SHALL display the variant's style label, total estimated cost, and a summary of the first Day_Plan's hotel name, first activity, and weather forecast (if available).
3. THE Variant_Selector SHALL allow the Guest to expand any variant card to preview up to 3 days of its Day_Plans before selecting.
4. WHEN a Guest clicks "Choose This Plan" on a variant card, THE Itinerary_View SHALL load the full selected Itinerary_Variant and the Variant_Selector SHALL be dismissed.
5. THE Variant_Selector SHALL allow the Guest to return to the Trip_Planner_Form to adjust inputs and regenerate variants without losing the existing variants until the new request completes.
6. WHEN the viewport width is below 768px, THE Variant_Selector SHALL display variants in a vertically stacked layout instead of a side-by-side layout.

---

### Requirement 5: Itinerary Display

**User Story:** As a Guest, I want to view my selected itinerary in a clear, day-by-day layout, so that I can understand what is planned for each day of my trip.

#### Acceptance Criteria

1. THE Itinerary_View SHALL display one Day_Plan section per day, labelled with the day number and date.
2. EACH Day_Plan SHALL display the recommended hotel with name, star rating, price per night, and an image (sourced from the local dataset or Photo_Client).
3. EACH Day_Plan SHALL display at least one Restaurant_Card showing the restaurant name, cuisine type, and user rating.
4. EACH Day_Plan SHALL display at least one Activity_Card showing the activity name, description, and estimated duration.
5. WHERE a 5-day weather forecast is available, EACH Day_Plan SHALL display the forecast summary for that day including condition icon and temperature range.
6. WHERE destination metadata is available from RestCountries_Client, THE Itinerary_View SHALL display a destination info panel showing currency, language, and timezone.
7. THE Itinerary_View SHALL display a total estimated cost summary that aggregates hotel, dining, and activity costs for all days, scaled by guest count.
8. WHEN a Guest clicks a Hotel_Card, THE Itinerary_View SHALL navigate to the hotel booking flow for that property.
9. WHEN a Guest clicks an Activity_Card, THE Itinerary_View SHALL display a detail panel with full activity description and a "Book Activity" call to action.
10. THE Itinerary_View SHALL allow the Guest to navigate between days using Previous Day and Next Day controls without reloading the page.

---

### Requirement 6: Session-Based Booking (No Authentication Required)

**User Story:** As a Traveller, I want to make bookings without creating an account, so that I can complete my reservation quickly without a sign-up barrier.

#### Acceptance Criteria

1. THE Booking_Engine SHALL not require any form of user authentication or account creation to create or view bookings.
2. WHEN a booking is confirmed, THE Booking_Engine SHALL persist the booking record in the Session_Store using a session-scoped key.
3. THE Session_Store SHALL retain all booking records for the duration of the browser session and SHALL clear all records when the session ends.
4. WHEN a Traveller views the Booking_Manager in the same browser session, THE Booking_Manager SHALL retrieve and display all booking records from the Session_Store.
5. IF the Traveller opens the Booking_Manager in a new browser session, THEN THE Booking_Manager SHALL display an empty bookings list and SHALL inform the Traveller that bookings are session-scoped.
6. THE Booking_Engine SHALL generate a unique booking reference ID for each confirmed booking that is valid for the duration of the session.

---

### Requirement 7: Hotel Booking

**User Story:** As a Traveller, I want to book a hotel from the itinerary or from the standalone hotel listings page, so that I can secure my accommodation for the trip.

#### Acceptance Criteria

1. WHEN a Traveller selects a hotel and clicks "Book Now", THE Booking_Engine SHALL present a booking confirmation form requesting guest count, check-in date, check-out date, and contact name.
2. THE Booking_Engine SHALL display the total price for the stay before the Traveller confirms, calculated as price_per_night × number_of_nights × guest_rooms.
3. WHEN the Traveller confirms a hotel booking, THE Booking_Engine SHALL create a booking record in the Session_Store and SHALL assign it a unique booking reference ID.
4. WHEN a hotel booking is confirmed, THE Booking_Engine SHALL display a booking confirmation screen showing the booking reference ID, hotel name, dates, guest count, and total price.
5. IF a required booking form field is empty when the Traveller submits, THEN THE Booking_Engine SHALL display an inline validation error for each missing field and SHALL NOT process the booking.
6. THE Booking_Engine SHALL display the booking status as one of: Confirmed, Processing, or Cancelled.
7. WHEN a Traveller views the Booking_Manager in the same session, THE Booking_Manager SHALL list all bookings with their booking reference ID, destination, dates, guest count, and current status.

---

### Requirement 8: Activity & Restaurant Booking

**User Story:** As a Traveller, I want to reserve activities and restaurants directly from the itinerary, so that I don't have to coordinate bookings separately.

#### Acceptance Criteria

1. WHEN a Traveller clicks "Book Activity" on an Activity_Card, THE Booking_Engine SHALL present a booking form requesting the activity date, guest count, and contact name.
2. WHEN an activity booking is confirmed, THE Booking_Engine SHALL assign a unique booking reference ID, persist the record in the Session_Store, and SHALL display a confirmation screen.
3. WHEN a Traveller clicks "Reserve Table" on a Restaurant_Card, THE Booking_Engine SHALL present a reservation form requesting date, time slot, and party size.
4. WHEN a restaurant reservation is confirmed, THE Booking_Engine SHALL assign a unique booking reference ID, persist the record in the Session_Store, and SHALL display a confirmation screen.
5. IF the requested activity date falls outside the trip's Date_Range, THEN THE Booking_Engine SHALL display a date mismatch warning and SHALL require the Traveller to confirm before proceeding.

---

### Requirement 9: Destination Discovery & Browse

**User Story:** As a Guest, I want to browse available destinations on a dedicated search and discovery page, so that I can find inspiration before committing to a specific trip.

#### Acceptance Criteria

1. THE Search_Engine SHALL expose a destinations endpoint that accepts optional query parameters: destination name keyword, category (hotel, restaurant, activity), and travel dates.
2. WHEN a Guest searches for a destination by keyword, THE Search_Engine SHALL return results whose name, area, or category contains the keyword, case-insensitively.
3. WHEN a Guest applies a category filter, THE Search_Engine SHALL return only results matching that category.
4. THE Itinerary_View SHALL display destination cards in a responsive grid of 1 column on mobile, 2 columns on tablet, and 3 columns on desktop.
5. WHEN a Guest selects a destination card, THE Itinerary_View SHALL navigate to the destination detail page displaying an overview, gallery sourced from the Photo_Client, highlights, and a booking widget.

---

### Requirement 10: Booking Management Dashboard

**User Story:** As a Traveller, I want to review and manage all my bookings in one place for the current session, so that I can track my travel plans and make changes if needed.

#### Acceptance Criteria

1. THE Booking_Manager SHALL display bookings grouped by status: Upcoming, Completed, and Cancelled.
2. WHEN a Traveller selects an upcoming booking, THE Booking_Manager SHALL display the full booking details including reference ID, destination, hotel name, dates, guest count, and total price.
3. THE Booking_Manager SHALL allow a Traveller to cancel an upcoming booking by clicking "Cancel Booking" and confirming the action in a modal dialog.
4. WHEN a booking is cancelled, THE Booking_Engine SHALL update the booking status to Cancelled in the Session_Store and SHALL reflect this change in the Booking_Manager within 2 seconds.
5. THE Booking_Manager SHALL display a travel credit balance and reward points summary in a sidebar widget, consistent with the existing Voyage Elite Rewards UI.

---

### Requirement 11: API Endpoints

**User Story:** As a developer, I want well-defined REST API endpoints for trip planning and booking, so that the frontend and backend are cleanly decoupled and individually testable.

#### Acceptance Criteria

1. THE API_Server SHALL expose a POST /api/itinerary/generate endpoint that accepts destination, checkIn, checkOut, and guestCount and returns an array of 2–3 structured Itinerary_Variant objects.
2. THE API_Server SHALL expose a GET /api/destinations/enrich endpoint that accepts a destination name and returns merged data from RestCountries_Client, Weather_Client, and Photo_Client for that destination.
3. THE API_Server SHALL expose a POST /api/bookings endpoint that accepts bookingType (hotel, activity, restaurant), itemId, guestCount, startDate, endDate, and contactName and returns a booking confirmation object with a unique reference ID.
4. THE API_Server SHALL expose a GET /api/bookings endpoint that accepts a sessionId query parameter and returns all bookings stored for that session.
5. THE API_Server SHALL expose a DELETE /api/bookings/:id endpoint that cancels a booking by its reference ID and returns the updated booking record.
6. WHEN the API_Server receives a malformed or incomplete request body, THE API_Server SHALL respond with HTTP 400 and a descriptive error message.
7. WHEN the API_Server encounters an internal processing error, THE API_Server SHALL respond with HTTP 500 and a descriptive error message, and SHALL NOT expose internal stack traces to the client.
8. THE API_Server SHALL respond to all /api/itinerary/generate requests within 10 seconds for trips of up to 14 days.
9. THE API_Server SHALL support CORS for requests originating from the Vite development server (localhost:5173).

---

### Requirement 12: Responsive & Accessible UI

**User Story:** As a Guest, I want the travel planner and booking pages to work correctly on all screen sizes and be accessible, so that I can plan my trip from any device.

#### Acceptance Criteria

1. THE Trip_Planner_Form SHALL be fully functional on viewport widths from 375px to 1440px.
2. THE Itinerary_View SHALL reflow to a single-column layout on viewport widths below 768px.
3. THE Trip_Planner_Form, Hotel_Card, Activity_Card, and Restaurant_Card components SHALL meet WCAG 2.1 AA colour contrast requirements.
4. ALL interactive elements (buttons, form fields, cards) SHALL be focusable and operable via keyboard.
5. THE Itinerary_View and Booking_Manager SHALL use semantic HTML landmarks (header, main, section, nav) to support screen reader navigation.
6. WHERE images are displayed, THE Itinerary_View SHALL provide descriptive alt text for all non-decorative images, including Unsplash-sourced photos.
7. WHERE Unsplash photos are displayed, THE Itinerary_View SHALL render the photographer attribution credit required by the Unsplash API guidelines.
