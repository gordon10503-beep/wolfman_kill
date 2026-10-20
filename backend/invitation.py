"""Room-invite QR artwork, generated without external services or image dependencies."""
import qrcode


def qr_svg(url):
    code=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4)
    code.add_data(url);code.make(fit=True)
    matrix=code.get_matrix();side=len(matrix);paths=[]
    for y,row in enumerate(matrix):
        x=0
        while x<side:
            if not row[x]:x+=1;continue
            start=x
            while x<side and row[x]:x+=1
            paths.append(f"M{start} {y}h{x-start}v1h-{x-start}z")
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" role="img" aria-label="Scan to join this Moonfall room"><rect width="{side}" height="{side}" fill="#fff"/><path d="{"".join(paths)}" fill="#000" shape-rendering="crispEdges"/></svg>'
