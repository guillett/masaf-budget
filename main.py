import xml.etree.ElementTree as ET


def main():
    file = "/home/thomas/Téléchargements/masa/SearchRequest2.xml"
    tree = ET.parse(file)
    root = tree.getroot()
    print(root)


if __name__ == "__main__":
    main()
