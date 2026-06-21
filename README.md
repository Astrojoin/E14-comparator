# E14-comparator

Escanea una carpeta de PDFs y detecta duplicados con hashes inconsistentes en el nombre del archivo.

## Problema

Cuando se descargan archivos PDF repetidamente, el navegador o OS agrega sufijos (1), (2), etc. En la mayoria de los casos, el hash en el nombre es identico al original. Pero a veces el hash cambia y el nombre conserva la convencion de duplicado con un hash distinto.

Ejemplo de anomalia:
    ec1b3402...ac02...pdf          <- original
    ec1b3402...ac02... (1).pdf     <- duplicado correcto
    ec1b3402...ac12... (1).pdf     <- HASH DISTINTO

E14-comparator detecta esa diferencia.

## Instalacion

    git clone git@github.com:Astrojoin/E14-comparator.git
    cd E14-comparator

No requiere dependencias externas. Solo Node.js >= 18.

## Uso

    node index.js /ruta/a/carpeta            # Reporte completo en texto
    node index.js /ruta/a/carpeta --json     # Salida en JSON
    node index.js /ruta/a/carpeta --summary  # Solo resumen
    node index.js --help                     # Ayuda

## Convencion de nombres

- hash.pdf       = Original (primer archivo, sin sufijo)
- hash (1).pdf   = Duplicado (primera copia/descarga)
- hash (2).pdf   = Duplicado (segunda copia/descarga)

El hash es la parte del nombre antes de .pdf o antes de (N).pdf.

## Como funciona

1. Escaneo: Lee todos los .pdf de la carpeta y parsea el nombre.
2. Agrupacion: Los duplicados cuyo hash coincide con un original se agrupan con el.
3. Deteccion de anomalias: Los duplicados cuyo hash no coincide con ningun original se comparan contra todos los originales usando la distancia de Levenshtein. Se asignan al original mas cercano y se marca como anomalia.
4. Reporte: Muestra resumen, detalle por grupo, y anomalias con la posicion exacta de los caracteres que difieren.

## Ejemplo de salida

    ======================================================================
      E14-COMPARATOR - REPORTE DE ANALISIS DE PDFs
    ======================================================================

    Resumen:
      Grupos (hashes originales):  2
      Archivos originales:         2
      Duplicados (total):          4
      Duplicados correctos:        3
      Duplicados con hash distinto: 1

    [!] Grupo: ec1b340260f0d461...
       Original:  ec1b3402...pdf
       [ ] (1) ec1b3402...ac02... (1).pdf        <- correcto
       [X] (1) ec1b3402...ac12... (1).pdf        <- HASH DISTINTO

    ======================================================================
      ANOMALIAS DETECTADAS (1)
    ======================================================================

    [X] Hash inconsistente:
       Original hash:     ...ac02...
       Duplicado hash:    ...ac12...
       Distancia Levenshtein: 1
       Diferencias por posicion:
         Pos 45: original=0  duplicado=1

## Licencia

ISC
