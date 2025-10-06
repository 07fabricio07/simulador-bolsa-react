import React from "react";

export default function MiPortafolio() {
  // Puedes agregar aquí los datos dinámicos luego si lo deseas
  return (
    <div>
      <h2>Mi portafolio</h2>
      <table style={{ width: "300px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "left" }}>Acción</th>
            <th style={{ border: "1px solid #ccc", padding: "0.5em", textAlign: "left" }}>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>CC</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}></td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>AA</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}></td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>EE</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}></td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>QQ</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}></td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>ZZ</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}></td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}>BB</td>
            <td style={{ border: "1px solid #ccc", padding: "0.5em" }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}