"""
Generate the Nazmul Commerce ADMIN manual QA test plan as a PDF.

Every case is something an operator actually does to run the shop, in the order
they would do it: set the store up, stock it, price it, take an order, get paid,
and look at the numbers afterwards.

Landscape A4 so steps and expected results sit side by side. Built-in Helvetica
is WinAnsi-encoded and has no glyph for the Taka sign, so money is written "Tk"
throughout -- a raw sign renders as a black box.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

PAGE = landscape(A4)
MARGIN = 13 * mm

BRAND = colors.HexColor("#1B4DFF")
INK = colors.HexColor("#14161A")
INK_SOFT = colors.HexColor("#3D434D")
INK_MUTED = colors.HexColor("#6B7280")
LINE = colors.HexColor("#E2E1DD")
SUNKEN = colors.HexColor("#F6F6F4")
OK = colors.HexColor("#0F766E")
WARN = colors.HexColor("#B45309")
DANGER = colors.HexColor("#BE123C")

_ss = getSampleStyleSheet()


def S(name, **kw):
    base = dict(fontName="Helvetica", fontSize=8.1, leading=10.4, textColor=INK_SOFT)
    base.update(kw)
    return ParagraphStyle(name, **base)


TITLE = S("t", fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=INK)
SUB = S("s", fontSize=11, leading=15, textColor=INK_MUTED)
H1 = S("h1", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=BRAND)
H2 = S("h2", fontName="Helvetica-Bold", fontSize=9.6, leading=12, textColor=INK)
BODY = S("b", fontSize=9, leading=12.6)
SMALL = S("sm", fontSize=7.8, leading=10, textColor=INK_MUTED)
CELL = S("c")
CELL_B = S("cb", fontName="Helvetica-Bold", textColor=INK)
CELL_ID = S("ci", fontName="Helvetica-Bold", fontSize=7.6, textColor=BRAND)
NOTE = S("n", fontSize=8.2, leading=11, textColor=WARN)


# ---------------------------------------------------------------------------
# The plan. (section title, intro, [(id, action, expected), ...])
# ---------------------------------------------------------------------------

SECTIONS = [
(
 "1. Getting in, and who can see what",
 "Do this first. Everything else assumes you are signed in as a full admin, and "
 "section 14 assumes you have a manager to test against.",
 [
  ("A-001", "Open /admin while signed out.",
   "Redirected to the sign-in page with ?next=/admin. No admin content flashes first."),
  ("A-002", "Sign in with a customer account (no staff role), then open /admin.",
   "Redirected away to the storefront. No admin page is reachable by typing the URL."),
  ("A-003", "Sign in as the admin account. Open /admin.",
   "Dashboard loads. KPI tiles appear first, then the chart and tables fill in."),
  ("A-004", "Look at the left navigation.",
   "16 links: Products, Categories, Brands, Stock, Orders, Payments, Customers, Coupons, "
   "Promotions, Banners, Reviews, Reports, Credit accounts, Staff, Design, Settings."),
  ("A-005", "Read each dashboard tile: today's sales, this month, gross margin, "
   "pending, delivered, customers, low stock, reviews to moderate.",
   "Eight tiles, all showing numbers (zero is fine). None stuck on a loading skeleton."),
  ("A-006", "Click the 'Pending orders' tile.",
   "Opens the orders list already filtered to placed orders."),
  ("A-007", "Click 'Low stock' and 'Reviews to moderate' tiles.",
   "Each opens its own section. Counts on the tile match what the page lists."),
  ("A-007a", "Click Products, then Orders, then Customers, then Dashboard in the left "
   "navigation, one after another.",
   "Each click responds at once with a grey loading outline, and the page fills in "
   "shortly after (about a second or less on normal mobile data). No click feels frozen."),
  ("A-008", "Sign out from the admin panel.",
   "Returned to the storefront, signed out. Going back to /admin asks you to sign in again."),
 ],
),
(
 "2. Categories and brands -- adding, editing, ordering",
 "Categories drive the storefront navigation, the homepage tiles and the listing "
 "filters. Test these before products, because a product needs a category. Keep "
 "one small JPG or PNG picture on the computer or phone you test with -- every "
 "picture in admin is uploaded from the device; there are no link boxes.",
 [
  ("C-001", "Open Categories. Count the existing rows.",
   "All current categories listed, each showing how many products it holds."),
  ("C-002", "Click 'New category'. Enter name 'QA Test Category' and save with the "
   "slug field left empty.",
   "Saved. The slug is generated automatically from the name (qa-test-category)."),
  ("C-003", "Create a second category and type the SAME slug by hand.",
   "Rejected with 'That slug is taken.' Nothing is created."),
  ("C-004", "Edit 'QA Test Category': add a description and an icon name "
   "(for example Headphones).",
   "Saved. The icon shows on the row and on the storefront category tile."),
  ("C-005", "Enter a nonsense icon name like 'NotARealIcon' and save.",
   "Saves without error and falls back to a default box icon. No crash."),
  ("C-006", "Set position to 1 on your test category and save.",
   "It moves to the top of the list, and to the front of the storefront nav bar."),
  ("C-007", "Tick 'Featured' and save. Open the storefront homepage.",
   "It appears in the 'Shop by category' grid (which shows 12 featured tiles)."),
  ("C-008", "Untick 'Active' and save. Open the storefront.",
   "Gone from the nav bar, the drawer and the homepage grid. Still listed in admin."),
  ("C-009", "Open the storefront drawer (Categories button) and count the rows.",
   "Every active category appears, each with a tag icon, plus the red Sale row."),
  ("C-010", "Delete 'QA Test Category' while it has no products.",
   "Deleted. It disappears from admin and the storefront."),
  ("C-011", "Assign a product to a category, then try to delete that category "
   "(section 3 first).",
   "Refused: the message says products still use it. Nothing is deleted. Move the "
   "products to another category first, then the delete works."),
  ("C-012", "Edit a category and press 'Upload picture'. Choose a photo from the device.",
   "A spinner shows, then the picture appears in the form. Save: the picture shows on "
   "the homepage category tile."),
  ("C-013", "Edit that category again, remove the picture with the X, and save.",
   "The tile falls back to its icon. No broken-image box anywhere."),
  ("C-014", "Try to upload a PDF or a text file as a category picture.",
   "Refused with 'use a JPG, PNG, WebP or AVIF picture'. Nothing is uploaded."),
  ("BR-001", "Open Brands. Note the brands and their product counts.",
   "Every brand listed, each with the number of products that use it."),
  ("BR-002", "Click 'New brand'. Name it 'QA Brand', leave the slug empty, press "
   "'Upload logo', choose a picture, and create it.",
   "Created with slug qa-brand and the logo shown on its row."),
  ("BR-003", "Open a product and pick 'QA Brand' in its brand list. Save. Open the "
   "storefront listing and filter by brand.",
   "QA Brand is offered as a filter and shows that product."),
  ("BR-004", "Edit 'QA Brand': fix the spelling of its name and save.",
   "The new name shows on the product page and in the storefront filter."),
  ("BR-005", "Untick 'Show on the storefront' and save.",
   "Row shows 'Hidden'. The brand leaves the storefront filter; its products are unaffected."),
  ("BR-006", "Try to delete 'QA Brand' while a product uses it.",
   "Refused: products still use it. Nothing is deleted."),
  ("BR-007", "Move that product to another brand, then delete 'QA Brand'.",
   "Deleted. It disappears from admin and the storefront filter."),
  ("BR-008", "Create a brand with the same slug as an existing one.",
   "Rejected with 'That slug is taken.'"),
  ("BR-009", "Open New product. Under Brand press 'New brand', type 'Walton' and press Enter.",
   "Walton is added and selected in the Brand list. The product itself is NOT saved yet "
   "and nothing you typed in the form is lost."),
  ("BR-010", "Finish the product and save it. Open Brands in a new tab.",
   "The product is saved with brand Walton, and Walton is listed on the Brands page."),
  ("BR-011", "In the product form press 'New brand' and type 'anker' (lowercase) for a "
   "brand that already exists as 'Anker'.",
   "Message: 'Anker already exists -- selected it.' No second Anker appears anywhere."),
  ("BR-012", "Select a brand, press 'Rename <brand>', fix its spelling and press Save.",
   "The new name shows in the list at once, on the Brands page, and on the storefront "
   "product pages of that brand."),
  ("BR-012a", "After renaming a brand, search the storefront for the NEW name.",
   "Every product of that brand is found. Searching the old spelling no longer finds "
   "them by brand."),
  ("BR-013", "Rename a brand to the exact name of ANOTHER existing brand.",
   "Refused: 'Another brand is already called ...'. Nothing changes."),
  ("BR-014", "Add a brand whose name is typed only in Bangla letters (for example Walton "
   "written in Bangla).",
   "Added and selected without errors."),
  ("BR-015", "Open the add box, then press Escape (or the X).",
   "The box closes and the previously selected brand is still selected."),
  ("BR-016", "Press 'New brand', type a name, and WITHOUT pressing Add click "
   "'Create product'.",
   "The product is not saved. The browser points at the brand box: 'Press Add to create "
   "this brand, or cancel it, before saving the product.'"),
  ("BR-017", "Fill a product, but give it a SKU that another product already uses, and save.",
   "Refused with the duplicate-SKU message. Everything you typed -- and the brand you "
   "chose -- is still in the form."),
 ],
),
(
 "3. Products -- creating and editing",
 "The core of the job. Work through one product completely rather than skimming "
 "several.",
 [
  ("P-001", "Open Products. Note the count in the heading.",
   "Header shows the true total, not just the number of rows on screen."),
  ("P-002", "Scroll to the bottom of the product list.",
   "More rows load automatically as you reach the end. A 'Load more' button appears "
   "if they do not."),
  ("P-003", "Search for a product by name.",
   "Only matching rows shown. The count updates."),
  ("P-004", "Search using a SKU instead.",
   "Matches on SKU as well as name."),
  ("P-005", "Search for a term containing a comma or bracket, e.g. 'Pack (2)'.",
   "No error. The search treats it as text, not as filter syntax."),
  ("P-006", "Use the Active / Draft / Archived filter buttons.",
   "Each filter narrows the list. The active filter is highlighted."),
  ("P-007", "Click 'New product'. Fill name, slug, SKU, price and stock only. Save.",
   "Created. You land on the product or back in the list with a success message."),
  ("P-008", "Try to save a product with no name.",
   "Rejected with a field message. Nothing is created."),
  ("P-009", "Try to save a second product with the SAME SKU.",
   "Rejected. SKUs must be unique."),
  ("P-010", "Set a compare-at price LOWER than the price and save.",
   "Rejected. Compare-at must be higher than the price, or empty."),
  ("P-011", "Set compare-at higher than price. Open the product on the storefront.",
   "A discount badge shows the percentage saved, with the old price struck through."),
  ("P-012", "Set a cost price and save. Look at the product row in admin.",
   "Margin column shows money and a percentage. Cost is never shown on the storefront."),
  ("P-013", "Open the product page on the storefront as a signed-out visitor and "
   "view the page source.",
   "The cost price appears nowhere in the HTML."),
  ("P-014", "Fill description, short description, specifications, features, warranty, "
   "and delivery note. Save. Open the storefront product page.",
   "Every field appears in its correct place: tabs for description and specifications, "
   "a ticked list for features."),
  ("P-015", "In the Pictures box press 'Add pictures' and choose THREE photos at once "
   "from the device. Save.",
   "All three upload with a spinner, the first is marked 'Main'. After saving, the "
   "main picture is on the product card, and all three are in the product page gallery."),
  ("P-015a", "Use the arrows to move the third picture first (or press its star), then save.",
   "That picture is now 'Main' and becomes the card picture on the storefront."),
  ("P-015b", "Remove one picture with the X and save. Reopen the product.",
   "Only the remaining pictures come back, in the order you left them."),
  ("P-015c", "Remove EVERY picture from a product and save. Reopen it.",
   "The Pictures box is empty and no old picture comes back on the storefront card."),
  ("P-015d", "Upload a large phone photo (over 5 MB).",
   "Accepted: it is shrunk on the device before upload. It still looks sharp on the "
   "product page."),
  ("P-015e", "Try to add a 9th picture.",
   "The button is disabled at 8/8. Extra files chosen at once are skipped with a message."),
  ("P-016", "Set 'Reward points' to 50 and save. Open the storefront product page.",
   "'Earn 50 points with this item' appears near the price."),
  ("P-017", "Add that product to the cart and open the cart.",
   "'Earn 50 points when this order is delivered' appears (doubles to 100 for 2 units)."),
  ("P-018", "Set Reward points back to 0 and reload the product page.",
   "The points line disappears entirely."),
  ("P-019", "Set the product status to Draft.",
   "Gone from the storefront listing and search. Its URL no longer shows it for shoppers."),
  ("P-020", "Set it back to Active.",
   "Visible on the storefront again."),
  ("P-021", "Use the status toggle directly from the product list row.",
   "Status flips without opening the product. The list reflects it immediately."),
  ("P-022", "Archive a product.",
   "Leaves the Active list, appears under Archived, and is not purchasable."),
  ("P-022a", "Create a throwaway product 'QA Delete Me' with a picture. In the product "
   "list press its bin icon and read the message.",
   "It asks to delete permanently, says pictures, reviews and promotions go with it, "
   "that past orders keep their record, and suggests Archive for a reversible option."),
  ("P-022b", "Press Cancel.",
   "Nothing happens. The product is still listed."),
  ("P-022c", "Press the bin again and confirm.",
   "'QA Delete Me deleted.' It leaves the list and the storefront; its URL shows "
   "'not found'."),
  ("P-022d", "Open a product that has been ORDERED before, press Delete at the top of "
   "its page, and confirm. Then open that old order in Orders.",
   "The product is gone, and you are back on the product list. The old order still "
   "shows the item's name, SKU, price and picture exactly as before."),
  ("P-022e", "Make a bundle of two products (section 9), then delete ONE of them.",
   "The message says the bundle was deleted too. It is gone from Promotions, and the "
   "other product alone gets no bundle discount in the cart."),
  ("P-022f", "After deleting a product that sold this month, open the Dashboard.",
   "The Gross margin tile says it excludes the sold lines of deleted products, rather "
   "than counting their whole price as profit."),
  ("P-023", "Set stock to 0 on an active product. Open the storefront.",
   "Shows as out of stock. Add to cart is unavailable."),
  ("P-024", "Set low-stock threshold to 5 and stock to 3.",
   "Appears in Stock and on the dashboard 'Low stock' tile."),
  ("P-025", "Set a video URL and save.",
   "The video appears on the storefront product page."),
 ],
),
(
 "4. Stock",
 "Stock is the number most often wrong in a shop. Check it moves in both directions.",
 [
  ("S-001", "Open Stock. Note which products are flagged out of stock or low.",
   "Colour coded: red for zero, amber for at or below threshold."),
  ("S-002", "Change a stock number in the table and move focus away.",
   "Saves immediately without a separate save button. The colour updates."),
  ("S-003", "Enter a negative stock number.",
   "Rejected or clamped to zero. Stock never goes below zero."),
  ("S-004", "Note a product's stock, buy 1 of it on the storefront, return to Stock.",
   "Stock has dropped by exactly 1."),
  ("S-005", "Cancel that order from the Orders section, then return to Stock.",
   "Stock has gone back up by 1. Cancelling returns inventory."),
  ("S-006", "Set a product's stock to 1 and try to order 2 of it on the storefront.",
   "The cart flags it and will not let you check out with more than exists."),
 ],
),
(
 "5. Orders -- the daily work",
 "This is what an operator touches most. Place a real test order on the storefront "
 "first so there is something to work with.",
 [
  ("O-001", "Place a cash-on-delivery order on the storefront, then open Orders.",
   "The order appears at the top with status 'placed' and the correct total."),
  ("O-002", "Open the order.",
   "Customer name, phone, full shipping address, every line item, delivery charge, "
   "and the total all match what the customer saw."),
  ("O-003", "If the customer used the map at checkout, look for the location.",
   "Latitude, longitude and the place label are stored with the order."),
  ("O-004", "Move the order: placed -> confirmed.",
   "Status changes. A history entry is added with a timestamp."),
  ("O-005", "Continue: confirmed -> processing -> shipped -> out for delivery -> delivered.",
   "Each step is accepted and recorded in the order history in order."),
  ("O-006", "Check the customer's points after marking it delivered "
   "(product must have points set).",
   "Points are added to their balance. Account -> Refer & earn shows the entry."),
  ("O-007", "Set the order back to shipped, then to delivered again.",
   "Points are NOT awarded a second time. The balance is unchanged."),
  ("O-008", "Place another order and cancel it from placed.",
   "Status is cancelled, a reason is recorded, and the stock returns."),
  ("O-009", "Add an internal note to an order.",
   "Saved and visible to staff. It does NOT appear anywhere on the customer's view."),
  ("O-010", "Filter the orders list by status.",
   "Only orders in that status are listed."),
  ("O-011", "Search orders by order number.",
   "The matching order is found."),
  ("O-012", "Search by customer phone number.",
   "The customer's orders are found."),
  ("O-013", "Open the storefront /track page and enter the order number and phone.",
   "The customer sees the current status and history, and nothing about other orders."),
  ("O-014", "Enter a correct order number with the WRONG phone on /track.",
   "Nothing is shown. The order number alone is not enough to see an order."),
 ],
),
(
 "6. Payments -- manual bKash and Nagad",
 "Money changing hands. Test this carefully; it is where mistakes cost real Taka.",
 [
  ("M-001", "On the storefront, place an order choosing bKash.",
   "You land on a pay page showing the number to send to and the amount."),
  ("M-002", "Look for the payment countdown on that page.",
   "A timer shows how long is left to pay before the order is cancelled."),
  ("M-003", "Submit a transaction ID and a screenshot as the customer.",
   "Confirmation that it is awaiting verification. The page no longer invites payment."),
  ("M-004", "Open Payments in admin.",
   "The submission is listed as pending, with the order, amount and transaction ID."),
  ("M-005", "Open the screenshot the customer uploaded.",
   "It opens. The link is temporary and not a permanent public URL."),
  ("M-006", "Approve the payment.",
   "Payment marked verified, the order moves to confirmed, and who approved it is recorded."),
  ("M-007", "Place a second order and submit the SAME transaction ID.",
   "Rejected as already used. One transaction ID cannot pay for two orders."),
  ("M-008", "Reject a submitted payment with a reason.",
   "Marked failed with the reason stored. The customer can see they must try again."),
  ("M-009", "Place a bKash order and simply do not pay. Wait past the payment window, "
   "then reload the pay page.",
   "The order is cancelled automatically and the stock has returned."),
  ("M-010", "Check Settings for the payment window value.",
   "The number of minutes is configurable, and the checkout warning matches it."),
 ],
),
(
 "7. Customers",
 "",
 [
  ("U-001", "Open Customers. Note the total in the heading.",
   "Accounts listed newest first, 30 at a time, with orders and spend per customer."),
  ("U-002", "Scroll to the bottom of the list.",
   "More customers load as you reach the end."),
  ("U-003", "Search by name, then by email, then by phone.",
   "Each finds the right customer."),
  ("U-004", "Change a customer's role to manager.",
   "Saved. That account can now reach the admin panel."),
  ("U-005", "Try to change your OWN role.",
   "Not allowed. You cannot remove your own access and lock yourself out."),
  ("U-006", "Sign in as a manager and open Customers.",
   "Role dropdowns are not editable. Only a full admin changes roles."),
 ],
),
(
 "8. Coupons",
 "",
 [
  ("K-001", "Create a percentage coupon, for example QA10 at 10%.",
   "Created and listed as active."),
  ("K-002", "Apply QA10 in the storefront cart.",
   "Discount applied and shown as a separate line in the summary."),
  ("K-003", "Apply it again at checkout in the Order summary box.",
   "Works the same way. Both entry points behave identically."),
  ("K-004", "Create a fixed-amount coupon, for example QA100 for Tk 100.",
   "Applies a flat Tk 100 off."),
  ("K-005", "Set a minimum order value, then try the coupon on a smaller cart.",
   "Rejected with a message explaining the minimum."),
  ("K-006", "Set a usage limit of 1 and use it once, then try again.",
   "Rejected as exhausted."),
  ("K-007", "Set an end date in the past and try the coupon.",
   "Rejected as expired."),
  ("K-008", "Toggle a coupon off and try it.",
   "Rejected. Toggling back on makes it work again."),
  ("K-009", "Enter a code that does not exist.",
   "Rejected clearly, with no hint about which codes are real."),
  ("K-010", "Apply a coupon, then remove it in the cart.",
   "Total returns to what it was before."),
 ],
),
(
 "9. Promotions -- volume discounts and bundles",
 "Both are priced in SQL beside coupons, so a promotion and a coupon can never "
 "disagree with the cart.",
 [
  ("R-001", "Open Promotions. Create a quantity break: type part of a product's name "
   "(or its SKU) in the search box, pick it from the list, minimum 3, 15% off.",
   "Matching products appear as you type, with picture, SKU and price. The chosen one "
   "shows as a chip. After saving, the rule is listed under the product's name and "
   "the form is empty again."),
  ("R-001a", "Search with the words in a different order (e.g. 'tune jbl' for "
   "'JBL Tune 520BT').",
   "The product is still found. Words can be in any order."),
  ("R-001b", "Search for something that does not exist.",
   "'No product matches ...' -- no error."),
  ("R-001c", "In the search box use the arrow keys to highlight a result and press Enter.",
   "The highlighted product is chosen. The form is NOT submitted by the Enter key."),
  ("R-002", "Open that product on the storefront.",
   "'Buy more, save more' panel shows 'Buy 3 or more' and the per-unit price after "
   "the discount."),
  ("R-003", "Add 2 of that product to the cart.",
   "No discount. The tier has not been reached."),
  ("R-004", "Increase to 3.",
   "The discount applies and shows as an 'Offers' line in the cart summary."),
  ("R-005", "Try to create a second rule with the same product and the same minimum.",
   "Rejected. One rule per product per quantity."),
  ("R-006", "Try a minimum quantity of 1.",
   "Rejected. A 'buy 1' break is just a price change."),
  ("R-007", "Create a category-wide rule, then a product rule on a product in that "
   "category with a different percentage.",
   "The product rule wins in the cart. The product page advertises the same one."),
  ("R-008", "Create a bundle: search and add two products (each appears as a chip; "
   "the X on a chip removes it), 10% off.",
   "The button counts the products picked. After saving, the bundle is listed with "
   "both product names."),
  ("R-009", "Open either product on the storefront.",
   "The bundle panel shows both items, their prices, and the total saving."),
  ("R-010", "Put only ONE of the two in the cart.",
   "No bundle discount."),
  ("R-011", "Add the second one.",
   "The bundle discount applies, taken off those lines only."),
  ("R-012", "Add an unrelated third product to the same cart.",
   "The bundle discount does not grow. It is based on the bundle's own items."),
  ("R-013", "Try to create a bundle with only one product selected.",
   "Rejected. A bundle needs at least two."),
  ("R-014", "Delete a quantity break and a bundle.",
   "Both disappear from admin and stop applying in the cart."),
 ],
),
(
 "10. Credit accounts -- selling on account",
 "For regulars who settle later. Looked up at checkout by phone number.",
 [
  ("D-001", "Open Credit accounts. Grant one: a real phone, a name, limit Tk 5,000.",
   "Account created and listed with limit, outstanding and available."),
  ("D-002", "Enter an invalid phone number.",
   "Rejected with a message. Nothing is created."),
  ("D-003", "Enter the SAME phone again with a different limit.",
   "Updates the existing account rather than creating a duplicate."),
  ("D-004", "On the storefront checkout, type that phone and press 'Check credit'.",
   "Account found. Holder name, available and outstanding shown."),
  ("D-005", "Type a phone with NO account and press 'Check credit'.",
   "Says no account found. It does not hint at other people's accounts."),
  ("D-006", "Tick 'Use credit' and place the order.",
   "Order placed. The amount goes on the account instead of being collected."),
  ("D-007", "Return to Credit accounts.",
   "Outstanding has risen and available has fallen by the order amount."),
  ("D-008", "Keep ordering until the limit is used up.",
   "At the limit the checkbox is unavailable and a message explains why."),
  ("D-009", "Record a repayment against the account.",
   "Outstanding drops and available rises by that amount."),
  ("D-010", "Pause the account (untick active), then check it at checkout.",
   "Reports no account. A paused account cannot be used."),
 ],
),
(
 "11. Banners and the homepage",
 "",
 [
  ("B-001", "Open Banners. Create a hero banner: press 'Upload picture' and choose a tall "
   "(portrait) photo, then add title, subtitle, Bangla eyebrow text, link and accent colour.",
   "Created. It appears in the homepage hero card rail with the uploaded picture."),
  ("B-001a", "Edit that banner, press 'Replace picture', choose a different photo and save.",
   "The new picture shows on the homepage card; the old one is gone."),
  ("B-001b", "While editing banner A, click edit on banner B.",
   "The form switches to banner B's own title and pictures -- nothing carried over from A."),
  ("B-002", "Open the homepage on a PHONE-width screen.",
   "Exactly two hero cards fill the row. No sliver of a third is visible."),
  ("B-003", "Swipe the hero hard, as far as you can in one gesture.",
   "It advances exactly ONE card, no matter how long or fast the swipe."),
  ("B-004", "Swipe back.",
   "Goes back exactly one card."),
  ("B-005", "Check the Bangla eyebrow text renders.",
   "Bangla characters display correctly. No empty boxes."),
  ("B-006", "Create a promo strip banner.",
   "Appears as the dark bar under the hero."),
  ("B-007", "Create an offer card banner.",
   "Appears in the 'Why shop with us' section."),
  ("B-008", "Set a banner's start date in the FUTURE.",
   "It does not appear on the storefront yet."),
  ("B-009", "Set a banner's end date in the PAST.",
   "It no longer appears."),
  ("B-010", "Set priority on two banners.",
   "Higher priority shows first in the rail."),
  ("B-011", "Untick active on a banner.",
   "Removed from the storefront immediately."),
  ("B-012", "Click a hero card's button on the storefront.",
   "Goes to the link you set, and that page loads."),
  ("B-013", "Delete a banner.",
   "Gone from admin and the storefront."),
 ],
),
(
 "12. Reviews",
 "",
 [
  ("V-001", "As a customer who has a DELIVERED order, leave a review on that product.",
   "Accepted and held for moderation. It is not public yet."),
  ("V-002", "Try to review a product you have never bought.",
   "Not allowed. Only verified buyers can review."),
  ("V-003", "Open Reviews in admin.",
   "The pending review is listed with the product, the rating and the customer."),
  ("V-004", "Approve it, then open the product on the storefront.",
   "The review is public, and the product's rating average updates."),
  ("V-005", "Reject a different review.",
   "It never becomes public."),
  ("V-006", "Check the homepage review wall.",
   "Only approved reviews of 4 stars or more appear, with surnames shortened to an initial."),
 ],
),
(
 "13. Reports",
 "",
 [
  ("T-001", "Open Reports.",
   "Revenue, discounts, delivery, cancellations, average order value and gross profit."),
  ("T-002", "Switch the window: 7, 30, 90, 180 days.",
   "Every figure and the chart change to match the window."),
  ("T-003", "Compare revenue against the orders list for the same period.",
   "They agree. Cancelled and returned orders are excluded from both."),
  ("T-004", "Look at the per-product table.",
   "Ranked by revenue, showing units, revenue and margin per product."),
  ("T-005", "Look at the payment method breakdown.",
   "Counts per method add up to the number of valid orders."),
  ("T-006", "If the shop is very busy, check for a truncation notice.",
   "A warning appears saying the figures cover only the most recent orders. "
   "It does not present a partial number as the whole truth."),
 ],
),
(
 "14. Staff and permissions",
 "Only a full admin can do this. This is the section that protects everything else.",
 [
  ("W-001", "Open Staff. Add a staff member by their account email.",
   "Found and added. An unknown email is reported clearly."),
  ("W-002", "Give them the manager role with only Products and Stock permissions.",
   "Saved."),
  ("W-003", "Sign in as that manager.",
   "Only Products and Stock appear in the navigation."),
  ("W-004", "As that manager, type /admin/settings in the address bar.",
   "Blocked. Typing the URL does not get past the permission."),
  ("W-005", "As that manager, type /admin/staff in the address bar.",
   "Blocked. Staff and Settings are admin-only and cannot be delegated."),
  ("W-006", "As that manager, try /admin/design and /admin/credit.",
   "Both blocked. They are admin-only."),
  ("W-007", "Back as admin, add the Orders permission to that manager.",
   "The manager now sees Orders too, after a reload."),
  ("W-008", "Remove all permissions from the manager.",
   "They can sign in but see no sections."),
  ("W-009", "Try to change your own staff access.",
   "Refused. You cannot lock yourself out."),
  ("W-010", "Remove the staff member entirely.",
   "Their admin access ends. The customer account itself still works."),
 ],
),
(
 "15. Design -- colours and fonts",
 "Admin only. Changes go live on the storefront as soon as you save.",
 [
  ("G-001", "Open Design. Drag a colour picker.",
   "The live preview on the right updates instantly, without saving."),
  ("G-001a", "Look at the 'Brand palette' card.",
   "Eleven colours with their Bangla names and codes: Midnight navy #0B0F1A, Dark slate "
   "#151B2B, Violet #6C5CE7, Neon cyan #00E5FF, Off-white #F2F4F8, Deep navy #0F172A, "
   "Orange #FF6A00, Light grey #F3F4F6, Jet black #111111, Crimson red #FF2E4D, "
   "Yellow #FFD400."),
  ("G-001b", "Under 'Primary', tap the Violet swatch.",
   "Primary becomes #6C5CE7, the swatch gets a ring, and the preview button turns violet."),
  ("G-001c", "Under 'Primary', tap Neon cyan (or Yellow).",
   "A yellow box warns that white button text on it will be hard to read, with the "
   "ratio. Saving is still allowed."),
  ("G-001d", "Set Primary to Violet and save. On the storefront, look at a selected "
   "filter chip, the selected delivery option and a hovered button.",
   "The light tints and hover shades are violet too -- no leftover blue anywhere."),
  ("G-002", "Change the primary colour and press Save. Open the storefront.",
   "Buttons, links and highlights use the new colour throughout."),
  ("G-003", "Change the heading font and save. Reload the storefront.",
   "Headings change. Body text is unaffected."),
  ("G-004", "Change the body font and save.",
   "Body and interface text change."),
  ("G-005", "Open a page with Bangla text (the homepage hero).",
   "Bangla still renders correctly whatever Latin font is chosen. No empty boxes."),
  ("G-006", "Drag the corner rounding slider to 0 and save.",
   "Cards and buttons become square on the storefront."),
  ("G-007", "Press 'Reset to default'.",
   "The original palette, fonts and rounding come back on the storefront."),
  ("G-008", "As a manager (not admin), try to open /admin/design.",
   "Blocked."),
 ],
),
(
 "16. Settings -- the numbers that run the shop",
 "",
 [
  ("N-001", "Open Settings. Change the store name and save. Open the storefront.",
   "The new name shows in the header, the page title, the footer, the homepage "
   "'Buying from ...' and 'Best sellers' lines, and the About page. The developer "
   "credit line is not the store name and does not change."),
  ("N-001a", "Under Store, rewrite 'About the store' and save.",
   "The paragraph under the store name in the footer changes."),
  ("N-002", "Under Contact, change the phone, WhatsApp, email and hours.",
   "All appear in the footer and on the Contact page. The chat bubble (bottom right) "
   "calls and WhatsApps the NEW numbers."),
  ("N-002a", "Type the phone as 01712345678 (starting with 0) and save. Reload Settings.",
   "It still starts with 0 -- the leading zero is kept."),
  ("N-002b", "Type an email without an @ (e.g. 'bindutech.com') and save.",
   "Refused: the email box asks for a full address. Nothing is saved until it is "
   "fixed. (The footer never shows an email line for an invalid address.)"),
  ("N-002c", "Under Social links, change the Facebook link, clear the YouTube box, and "
   "enter a Messenger username. Save.",
   "The footer's Facebook icon opens the new page, the YouTube icon is gone, and the "
   "chat bubble offers Messenger (m.me/username)."),
  ("N-002d", "Paste a social link without https:// (e.g. 'facebook.com/x').",
   "Refused with 'Paste the full link, starting with https://'."),
  ("N-003", "Under Homepage, change the Warranty & replacement text.",
   "Appears on the homepage Warranty card and on every product page."),
  ("N-003a", "Under Homepage, change card 2's icon, title and text. Save and open the "
   "homepage.",
   "The 'Buying from ...' row shows the new icon and words."),
  ("N-003b", "Clear card 4's title AND text and save.",
   "The homepage row shows three cards. Typing into card 4 again brings it back."),
  ("N-003c", "Leave the Delivery card box empty, then change the Inside Dhaka charge "
   "(Delivery zones, lower on the page).",
   "The homepage Delivery card rewrites itself with the new charge. Typing your own "
   "text in the box replaces it; clearing the box goes back to the automatic text."),
  ("N-004", "Change the showroom address.",
   "Appears in the storefront footer and on the Contact page."),
  ("N-005", "Check the delivery options on a product page, in the cart and at checkout.",
   "Exactly two: Inside Dhaka and Outside Dhaka, with their charges and delivery "
   "times. Office Pickup is not offered anywhere. (It is listed in Settings as "
   "switched off, so it can be turned back on if pickup ever returns.)"),
  ("N-005a", "Open checkout with something in the cart and watch the Delivery line "
   "in the order summary as the page loads.",
   "It reads 'Calculating...' for a moment, then the real charge (Tk 50 for Inside "
   "Dhaka). It never flashes 'Free'."),
  ("N-006", "Change the Inside Dhaka charge and save. Open a product page.",
   "The Shipping options panel shows the new amount, and so does the cart and checkout."),
  ("N-006a", "Scroll to 'Checkout & rewards'. Read the current values.",
   "Advance payment, bKash/Nagad payment window, reward points, refer & earn and the "
   "prepaid delivery discount are all shown in taka, minutes and points -- not paisa."),
  ("N-006b", "Enter 150 as the advance percent and save.",
   "Refused: 'Percent: 1-100'. Nothing is saved."),
  ("N-007", "Under Checkout & rewards, change the payment window (minutes) and open "
   "checkout with bKash.",
   "The warning states the new number of minutes."),
  ("N-008", "Under Checkout & rewards, change the advance percentage and minimum.",
   "The 'Pay now' figure at checkout follows the new rule."),
  ("N-009", "Under Checkout & rewards, change what 1 point is worth and the minimum "
   "points to spend.",
   "The account page and the checkout redemption line reflect the new values."),
  ("N-010", "Under Checkout & rewards, change the Refer & earn amounts.",
   "The Refer & earn page quotes the new figures."),
  ("N-011", "Under Checkout & rewards, change the bKash and Nagad delivery discounts.",
   "The cart's 'Total by payment method' shows the new saving for bKash and Nagad."),
 ],
),
(
 "17. Points and referrals -- the loyalty side",
 "Set reward points on at least one product before starting (see P-016).",
 [
  ("L-001", "As a SIGNED-IN customer, order a product worth 50 points, quantity 2.",
   "The cart promised 100 points."),
  ("L-002", "Mark that order delivered in admin, then check the customer's account.",
   "100 points added, listed under Refer & earn with the order reference."),
  ("L-003", "Place a second order and tick 'Use my points' at checkout.",
   "Points come off the amount due, at the configured rate."),
  ("L-004", "Check the balance afterwards.",
   "Reduced by exactly what was spent, and never below zero."),
  ("L-005", "Try to redeem with fewer points than the minimum.",
   "The redemption option is not offered."),
  ("L-006", "As a GUEST (not signed in), order a product with points and have it delivered.",
   "The cart said the points are held for the mobile number."),
  ("L-007", "Now sign in (or sign up) with an account carrying THAT SAME phone number.",
   "The held points appear in the balance automatically."),
  ("L-008", "Sign in with an account carrying a DIFFERENT phone.",
   "Those points are NOT claimed. They stay held."),
  ("L-009", "Open Account -> Refer & earn and copy the referral link.",
   "A link containing your own code."),
  ("L-010", "Open that link in a private window and create a new account.",
   "Sign-up works. The referral is recorded as pending."),
  ("L-011", "Place an order on the new account and mark it delivered.",
   "Both sides are credited: the referrer and the new customer."),
  ("L-012", "Mark the same order delivered again.",
   "No second payout. The credit is unchanged."),
  ("L-013", "Spend the credit at checkout with 'Use my credit'.",
   "Applied against the order. Balance drops to match."),
 ],
),
(
 "18. Checkout location -- the map",
 "Run on a phone as well as a desktop. The prompt only appears over HTTPS.",
 [
  ("X-001", "At checkout, press 'Use my location' and ALLOW the prompt.",
   "A pin is dropped and the area and city fields fill in."),
  ("X-002", "Check which delivery option got selected.",
   "A pin inside Dhaka selects Inside Dhaka by itself. No city dropdown to pick from."),
  ("X-003", "Press 'Use my location' and DENY the prompt.",
   "A clear message offers the map and typing instead. Checkout still works."),
  ("X-004", "Type an address in the search box, e.g. 'Dhanmondi 27 Dhaka'.",
   "Suggestions appear. Picking one drops the pin and fills the fields."),
  ("X-005", "Press Enter in the search box.",
   "It searches. It does NOT submit the order."),
  ("X-006", "Drag the pin somewhere else on the map.",
   "The address fields update to the new spot."),
  ("X-007", "Edit the area and street fields by hand after using the map.",
   "Your typing is kept. The map does not overwrite it."),
  ("X-008", "Drag the pin outside Bangladesh, or use a VPN abroad and press "
   "'Use my location'.",
   "Refused with a message. No delivery charge is set from a foreign pin."),
  ("X-009", "Place the order with a pin set, then open it in admin.",
   "Latitude, longitude and the place label are stored on the order."),
  ("X-010", "Place an order WITHOUT touching the map.",
   "Works normally. The map is optional."),
 ],
),
(
 "19. A full run from empty -- the end-to-end check",
 "If you only have time for one thing, do this. It touches every part in the order "
 "a real day uses them.",
 [
  ("E-001", "Create a category.",
   "Appears on the storefront nav and drawer."),
  ("E-002", "Create a product in it: price, stock, reward points, image, description.",
   "Appears on the storefront listing and its category page."),
  ("E-003", "Add a quantity break and a bundle involving it.",
   "Both advertise correctly on the product page."),
  ("E-004", "Create a coupon.",
   "Applies in the cart."),
  ("E-005", "Create a hero banner pointing at the new category.",
   "Shows on the homepage and the button goes to the right place."),
  ("E-006", "As a customer, add the product to the cart and check the delivery options.",
   "Three options, each with its charge and time."),
  ("E-007", "Set a map location at checkout.",
   "Address fills in, delivery option selected automatically."),
  ("E-008", "Apply the coupon at checkout.",
   "Discount shown in the Order summary."),
  ("E-009", "Place the order with cash on delivery.",
   "Success page with an order number. NOT a fake success -- the order really exists."),
  ("E-010", "Find that exact order in admin.",
   "Present, with the right lines, total, address, coordinates and payment method."),
  ("E-011", "Check stock.",
   "Down by the quantity ordered."),
  ("E-012", "Move the order through to delivered.",
   "History records every step."),
  ("E-013", "Check the customer's points.",
   "Awarded once, matching the product's points times the quantity."),
  ("E-014", "Check Reports.",
   "The order's revenue and margin appear in the current window."),
  ("E-015", "Place a second order and redeem the points.",
   "Amount due reduced. Balance reduced to match."),
  ("E-016", "Cancel that second order.",
   "Stock returns."),
  ("E-017", "Tidy up: archive the test product, delete the test category, coupon, "
   "promotions and banner.",
   "All removed. The storefront looks as it did before the test."),
 ],
),
]


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def header_footer(canvas, doc):
    canvas.saveState()
    w, h = PAGE

    canvas.setFillColor(BRAND)
    canvas.rect(0, h - 7 * mm, w, 7 * mm, stroke=0, fill=1)

    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.white)
    canvas.drawString(MARGIN, h - 5 * mm, "NAZMUL COMMERCE")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - MARGIN, h - 5 * mm, "Admin manual QA test plan")

    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 10 * mm, w - MARGIN, 10 * mm)

    canvas.setFont("Helvetica", 7.4)
    canvas.setFillColor(INK_MUTED)
    canvas.drawString(MARGIN, 6.4 * mm,
                      "Tick each row as you go. Record anything that fails with the "
                      "case ID, what you saw, and a screenshot.")
    canvas.drawRightString(w - MARGIN, 6.4 * mm, "Page %d" % doc.page)
    canvas.restoreState()


def build(path):
    doc = BaseDocTemplate(
        path,
        pagesize=PAGE,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=13 * mm, bottomMargin=14 * mm,
        title="Nazmul Commerce - Admin manual QA test plan",
        author="Nazmul Commerce",
    )
    frame = Frame(MARGIN, 14 * mm, PAGE[0] - 2 * MARGIN,
                  PAGE[1] - 27 * mm, id="f")
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame],
                                       onPage=header_footer)])

    total = sum(len(rows) for _, _, rows in SECTIONS)
    flow = []

    # ---- cover -----------------------------------------------------------
    flow += [
        Spacer(1, 30 * mm),
        Paragraph("Admin manual QA test plan", TITLE),
        Spacer(1, 3 * mm),
        Paragraph(
            "Every job an operator does to run the store, written so it can be "
            "tested by hand with no technical knowledge.", SUB),
        Spacer(1, 9 * mm),
    ]

    cover = [
        ["Cases", str(total)],
        ["Sections", str(len(SECTIONS))],
        ["Store", "https://bidyut-commerce.vercel.app"],
        ["Admin", "https://bidyut-commerce.vercel.app/admin"],
        ["You need", "A full admin account. Section 14 also needs a manager account "
                     "to test permissions against."],
        ["Also useful", "A phone, for the map and for two-cards-per-swipe checks. "
                        "The location prompt only appears over HTTPS."],
        ["Test data", "Prefix anything you create with 'QA' so it is easy to find "
                      "and remove afterwards. Section 19 ends with the clean-up."],
        ["Money", "Written as Tk throughout."],
    ]
    t = Table(cover, colWidths=[32 * mm, 150 * mm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8.6),
        ("FONT", (1, 0), (1, -1), "Helvetica", 8.6),
        ("TEXTCOLOR", (0, 0), (0, -1), INK),
        ("TEXTCOLOR", (1, 0), (1, -1), INK_SOFT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
    ]))
    flow += [t, Spacer(1, 8 * mm),
             Paragraph(
                 "How to use this: work top to bottom. Later sections assume the "
                 "earlier ones passed -- you cannot test an order without a product, "
                 "and you cannot test a product without a category. If a case fails, "
                 "note it and carry on; one failure rarely blocks the rest.", SMALL),
             PageBreak()]

    # ---- contents --------------------------------------------------------
    flow += [Paragraph("What is covered", H1), Spacer(1, 4 * mm)]
    toc = [[Paragraph("<b>Section</b>", CELL_B), Paragraph("<b>Cases</b>", CELL_B)]]
    for title, _intro, rows in SECTIONS:
        toc.append([Paragraph(title, CELL), Paragraph(str(len(rows)), CELL)])
    t = Table(toc, colWidths=[150 * mm, 20 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SUNKEN),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    flow += [t, PageBreak()]

    # ---- sections --------------------------------------------------------
    for title, intro, rows in SECTIONS:
        block = [Paragraph(title, H1)]
        if intro:
            block += [Spacer(1, 1.5 * mm), Paragraph(intro, SMALL)]
        block += [Spacer(1, 3 * mm)]
        flow += [KeepTogether(block)]

        data = [[
            Paragraph("<b>ID</b>", CELL_B),
            Paragraph("<b>What to do</b>", CELL_B),
            Paragraph("<b>What should happen</b>", CELL_B),
            Paragraph("<b>Pass</b>", CELL_B),
            Paragraph("<b>Notes</b>", CELL_B),
        ]]
        for cid, action, expected in rows:
            data.append([
                Paragraph(cid, CELL_ID),
                Paragraph(action, CELL),
                Paragraph(expected, CELL),
                Paragraph("", CELL),
                Paragraph("", CELL),
            ])

        t = Table(
            data,
            colWidths=[15 * mm, 84 * mm, 104 * mm, 13 * mm, 45 * mm],
            repeatRows=1,
        )
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SUNKEN),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.4, LINE),
            ("ALIGN", (3, 0), (3, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        flow += [t, Spacer(1, 7 * mm)]

    # ---- sign-off --------------------------------------------------------
    flow += [PageBreak(), Paragraph("Sign-off", H1), Spacer(1, 4 * mm),
             Paragraph(
                 "Fill this in when the run is finished. A run with failures is "
                 "still a useful run -- record them rather than repeating the "
                 "whole plan.", SMALL),
             Spacer(1, 5 * mm)]

    sign = [
        ["Tested by", "", "Date", ""],
        ["Build / deployment", "", "Environment", ""],
        ["Cases passed", "", "Cases failed", ""],
        ["Blocking issues found", "", "", ""],
        ["Notes", "", "", ""],
    ]
    t = Table(sign, colWidths=[42 * mm, 88 * mm, 32 * mm, 99 * mm], rowHeights=[
        11 * mm, 11 * mm, 11 * mm, 20 * mm, 26 * mm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8.6),
        ("FONT", (2, 0), (2, -1), "Helvetica-Bold", 8.6),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("SPAN", (1, 3), (3, 3)),
        ("SPAN", (1, 4), (3, 4)),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    flow += [t]

    doc.build(flow)
    return total


if __name__ == "__main__":
    import os
    os.makedirs("docs", exist_ok=True)
    n = build("docs/Admin-QA-Test-Plan.pdf")
    print("docs/Admin-QA-Test-Plan.pdf written -- %d cases, %d sections"
          % (n, len(SECTIONS)))
